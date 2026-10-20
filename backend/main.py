import json
import io
import re
import threading
from pathlib import Path
from typing import Dict, Iterator, List, Optional

import chromadb
import cuid
import mlx.core as mx
import uvicorn
from chromadb import Documents, EmbeddingFunction, Embeddings
from chromadb.errors import NotFoundError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from huggingface_hub import snapshot_download
from langchain_text_splitters import RecursiveCharacterTextSplitter
from mlx_lm import convert, generate, load, stream_generate
from mlx_lm.sample_utils import make_logits_processors, make_sampler
from pydantic import BaseModel, Field
from PyPDF2 import PdfReader

from bert_model import load_model

BACKEND_DIR = Path(__file__).resolve().parent
MODELS_DIR = BACKEND_DIR / "models"
BERT_DIR = MODELS_DIR / "bert models" / "all-MiniLM-L6-v2"
BERT_WEIGHTS = BERT_DIR / "model.npz"
CHROMA_DIR = BACKEND_DIR / "chroma_db"
MAX_UPLOAD_BYTES = 50 * 1024 * 1024
ALLOWED_ORIGINS = ["http://localhost:5173", "http://127.0.0.1:5173"]
_NAME_RE = re.compile(r"^[A-Za-z0-9][A-Za-z0-9._-]*$")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)


def resolve_in_models_dir(raw: str, allow_root: bool = True) -> Path:
    """Resolve a client-supplied path and ensure it stays inside MODELS_DIR.

    Relative paths are interpreted relative to the backend directory, so the
    frontend's default "./models" maps to MODELS_DIR.
    """
    candidate = Path(raw.strip() or ".")
    if not candidate.is_absolute():
        candidate = BACKEND_DIR / candidate
    resolved = candidate.resolve()
    if resolved == MODELS_DIR:
        if allow_root:
            return resolved
    elif resolved.is_relative_to(MODELS_DIR):
        return resolved
    raise HTTPException(status_code=400, detail=f"Path must be inside {MODELS_DIR}")


class ModelLoader:
    """Caches the most recently loaded model; loading is serialized by a lock."""

    _lock = threading.Lock()
    _path: Optional[Path] = None
    _model = None
    _tokenizer = None

    @classmethod
    def get(cls, path: Path):
        with cls._lock:
            if cls._path != path:
                cls._model, cls._tokenizer = load(str(path))
                cls._path = path
            return cls._model, cls._tokenizer


class MlxEmbedding(EmbeddingFunction):
    """all-MiniLM-L6-v2 sentence embeddings: mean pooling + L2 normalization."""

    def __init__(self, bert_dir: Path, weights_path: Path, batch_size: int = 32) -> None:
        if not weights_path.exists():
            raise RuntimeError(
                f"Embedding weights not found at {weights_path}. "
                "Run `python convert_bert.py` from the backend directory."
            )
        self.model, self.tokenizer = load_model(str(bert_dir), str(weights_path))
        self.batch_size = batch_size

    @staticmethod
    def name() -> str:
        return "mlx-all-minilm-l6-v2"

    def __call__(self, input: Documents) -> Embeddings:
        docs = list(input)
        out: Embeddings = []
        for start in range(0, len(docs), self.batch_size):
            batch = docs[start:start + self.batch_size]
            tokens = self.tokenizer(
                batch, return_tensors="np", padding=True, truncation=True, max_length=256
            )
            tokens = {key: mx.array(v) for key, v in tokens.items()}
            hidden, _ = self.model(**tokens)
            mask = tokens["attention_mask"].astype(hidden.dtype)[..., None]
            summed = (hidden * mask).sum(axis=1)
            counts = mx.maximum(mask.sum(axis=1), 1e-9)
            pooled = summed / counts
            norms = mx.maximum(mx.linalg.norm(pooled, axis=1, keepdims=True), 1e-12)
            out.extend((pooled / norms).tolist())
        return out


_embedding_fn: Optional[EmbeddingFunction] = None
_client = None


def get_embedding_fn() -> EmbeddingFunction:
    """Lazily load the embedding model (keeps imports cheap, e.g. for tests)."""
    global _embedding_fn
    if _embedding_fn is None:
        _embedding_fn = MlxEmbedding(BERT_DIR, BERT_WEIGHTS)
    return _embedding_fn


def get_client():
    global _client
    if _client is None:
        _client = chromadb.PersistentClient(path=str(CHROMA_DIR))
    return _client


class Content(BaseModel):
    content: str
    role: str


class Messages(BaseModel):
    pid: List[str]
    messages: List[Content]


class ModelApi(BaseModel):
    messages: Messages
    model: str
    role_mapping: dict | None = None
    stream: bool | None = False
    max_tokens: int | None = 100
    temp: float | None = 0.2
    top_p: float | None = 1.0
    repetition_penalty: float | None = 1.0


class InstallModel(BaseModel):
    hf_path: str
    name: str
    model_path: str
    quantization: int
    # Optional user-supplied Hugging Face token (gated/private repos, rate limits).
    # repr=False keeps it out of reprs/tracebacks; it is never logged.
    hf_token: Optional[str] = Field(default=None, repr=False)


@app.get("/models")
def get_model_names(path: str | None = "./models"):
    directory = resolve_in_models_dir(path or "./models")
    if not directory.is_dir():
        raise HTTPException(status_code=404, detail="Directory not found")
    return {
        "models": [
            entry.name
            for entry in sorted(directory.iterdir())
            if entry.is_dir() and entry.name != "bert models" and not entry.name.startswith(".")
        ]
    }


@app.get("/check_dir")
def check_dir(path: str) -> bool:
    try:
        return resolve_in_models_dir(path).is_dir()
    except HTTPException:
        return False


def convert_chat(messages: List[Content], role_mapping: Optional[Dict[str, str]] = None) -> str:
    if role_mapping is None:
        role_mapping = {
            "bos": "",
            "system": "system",
            "user": "user",
            "assistant": "assistant",
            "eot": "",
            "eos": "",
        }
    prompt = role_mapping.get("bos", "")
    stop = role_mapping.get("eot", "")
    for line in messages:
        prompt += f"{role_mapping.get(line.role, '')}{line.content}{stop}"
    prompt += role_mapping.get("assistant", "")
    return prompt.rstrip()


def generate_stream(model, tokenizer, prompt: str, max_tokens: int, sampler, logits_processors, stop: Optional[str]) -> Iterator[str]:
    for response in stream_generate(
        model, tokenizer, prompt, max_tokens=max_tokens, sampler=sampler, logits_processors=logits_processors
    ):
        text = response.text
        if stop and stop in text:
            # The stop marker may arrive alone or inside a larger chunk.
            head = text.split(stop, 1)[0]
            if head:
                yield head
            break
        yield text


def get_collection(pid: str):
    try:
        return get_client().get_collection(name=pid, embedding_function=get_embedding_fn())
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Collection {pid} not found")


@app.post("/v1/chat/completions")
def generate_text(body: ModelApi):
    model_dir = resolve_in_models_dir(body.model, allow_root=False)
    if not model_dir.is_dir():
        raise HTTPException(status_code=404, detail="Model not found")
    try:
        model, tokenizer = ModelLoader.get(model_dir)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error loading model: {e}")

    messages = body.messages.messages
    if body.messages.pid and messages:
        content_str = ""
        for pid in body.messages.pid:
            results = get_collection(pid).query(query_texts=[messages[-1].content], n_results=2)
            for val, metadata in zip(results["documents"][0], results["metadatas"][0]):
                content_str += f"{val} \n metadata : {metadata} \n\n"
        question = messages[-1].content
        messages[-1].content = f"""You will receive a question or prompt along with relevant documents. Try to answer the question using the provided documents. You can also answer on your own (without looking at the documents).
    -----
    PROMPT : {question}
    -----
    DOCUMENTS : {content_str}
    ---
    """

    stop = None
    if body.role_mapping is not None:
        prompt = convert_chat(messages, role_mapping=body.role_mapping)
        stop = body.role_mapping.get("eot") or None
    else:
        try:
            prompt = tokenizer.apply_chat_template(
                [m.model_dump() for m in messages], tokenize=False, add_generation_prompt=True
            )
        except Exception as e:
            raise HTTPException(status_code=501, detail="Issue while tokenizing: " + str(e))

    sampler = make_sampler(temp=body.temp or 0.0, top_p=body.top_p or 0.0)
    logits_processors = make_logits_processors(repetition_penalty=body.repetition_penalty)
    max_tokens = body.max_tokens or 100

    if body.stream:
        return StreamingResponse(
            generate_stream(model, tokenizer, prompt, max_tokens, sampler, logits_processors, stop),
            media_type="text/plain",
        )
    text = generate(
        model, tokenizer, prompt, max_tokens=max_tokens, sampler=sampler, logits_processors=logits_processors
    )
    if stop and stop in text:
        text = text.split(stop, 1)[0]
    return {"message": text}


def _status_error(error: Exception, context: str, token: Optional[str]) -> str:
    """Single-line error status; scrubs the token in case a library echoes it."""
    message = " ".join(str(error).split())
    if token:
        message = message.replace(token, "***")
    return f"error: {message} , {context}\n"


# Bit widths mlx.core.quantize supports; 1-bit is excluded because the output is unusable.
ALLOWED_QUANT_BITS = {0, 2, 3, 4, 5, 6, 8}


def _is_quantized(model_dir: Path) -> bool:
    try:
        config = json.loads((model_dir / "config.json").read_text())
    except (OSError, ValueError):
        return False
    return bool(config.get("quantization") or config.get("quantization_config"))


def install_model(target: Path, hf_path: str, bits: int, token: Optional[str] = None) -> Iterator[str]:
    # Each status is newline-terminated so the client can split coalesced chunks.
    try:
        target.mkdir(parents=True, exist_ok=True)
    except Exception as e:
        yield _status_error(e, "Happen when creating the folder", token)
        return
    yield "downloading\n"
    try:
        # token=None keeps huggingface_hub's default behaviour (cached login / HF_TOKEN env).
        snapshot_download(repo_id=hf_path, local_dir=target, token=token)
    except Exception as e:
        yield _status_error(e, "Happen when downloading the model", token)
        return
    if bits > 0:
        if _is_quantized(target):
            yield "error: This model is already quantized. Pick an unquantized (fp16/bf16) model or set quantization to 0\n"
            return
        yield "quantazation\n"
        try:
            convert(hf_path=str(target), mlx_path=f"{target}-q{bits}", quantize=True, q_bits=bits)
        except Exception as e:
            yield _status_error(e, "Happen when quantazation the model", token)
            return
    yield "done\n"


@app.post("/add_models")
def add_models(body: InstallModel):
    name = body.name.strip()
    if not _NAME_RE.match(name):
        raise HTTPException(status_code=400, detail="Invalid model name")
    if body.quantization not in ALLOWED_QUANT_BITS:
        allowed = ", ".join(str(b) for b in sorted(ALLOWED_QUANT_BITS - {0}))
        raise HTTPException(status_code=400, detail=f"Invalid quantization: use 0 (none) or one of {allowed} bits")
    target = resolve_in_models_dir(body.model_path) / name
    resolve_in_models_dir(str(target), allow_root=False)
    if body.quantization > 0:
        resolve_in_models_dir(f"{target}-q{body.quantization}", allow_root=False)
    token = (body.hf_token or "").strip() or None
    return StreamingResponse(install_model(target, body.hf_path.strip(), body.quantization, token), media_type="text/plain")


@app.post("/delete_vdb/")
def delete_vdb(pid: str):
    try:
        get_client().delete_collection(name=pid)
    except NotFoundError:
        raise HTTPException(status_code=404, detail=f"Collection {pid} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting collection: {e}")
    return {"message": "success"}


async def read_limited(file: UploadFile) -> bytes:
    data = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(data) > MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=413, detail=f"File exceeds {MAX_UPLOAD_BYTES // (1024 * 1024)} MB limit")
    return data


@app.post("/create_vdb/")
async def create_vdb(file: UploadFile = File(...)):
    try:
        filename = file.filename or "upload"
        file_extension = filename.split(".")[-1].lower()
        contents = await read_limited(file)
        message: Dict[int, str] = {}

        if file_extension == "pdf":
            try:
                pdf_reader = PdfReader(io.BytesIO(contents))
                for i, page in enumerate(pdf_reader.pages):
                    message[i + 1] = page.extract_text() or ""
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error processing PDF file: {e}")
        else:
            try:
                message[0] = contents.decode("utf-8")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Issue while reading: {e}")

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,
            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )

        metadata_list = []
        text_list = []
        ids_list = []
        for page_num, text in message.items():
            if not text.strip():
                continue
            for i, doc in enumerate(text_splitter.create_documents([text])):
                text_list.append(doc.page_content)
                if page_num == 0:
                    metadata_list.append({"file_name": filename})
                else:
                    metadata_list.append({"page_number": page_num, "file_name": filename})
                ids_list.append(f"{page_num}_{i + 1}")

        if not text_list:
            raise HTTPException(status_code=400, detail="No extractable text found in file")

        pid = cuid.slug()
        collection = get_client().create_collection(name=pid, embedding_function=get_embedding_fn())
        collection.upsert(documents=text_list, metadatas=metadata_list, ids=ids_list)
        return {"pid": pid}

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {e}")


@app.get("/")
def read_root():
    return {"Hello": "world"}


if __name__ == "__main__":
    # Fail fast at startup if the embedding weights are missing.
    get_embedding_fn()
    get_client()
    uvicorn.run(app, host="127.0.0.1", port=8000, log_level="info")
