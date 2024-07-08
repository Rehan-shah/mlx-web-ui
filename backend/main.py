from typing import Dict, List, Literal, Optional,TypedDict, Union
from huggingface_hub import snapshot_download
from mlx_lm import load , stream_generate 
from mlx_lm.utils import generate_step
from pydantic import BaseModel
import json
from transformers.pipelines.base import collections
import uvicorn
import os
from fastapi.middleware.cors import CORSMiddleware
import mlx.core as mx
from fastapi import FastAPI , Response ,  HTTPException ,Form, File, UploadFile
from fastapi.responses import StreamingResponse
import mlx.nn as nn
from mlx_lm.utils import convert
from chromadb import Collection, Documents, EmbeddingFunction, Embeddings 
import chromadb
from bert_model import load_model
import cuid
from PyPDF2 import PdfReader
import json
import io

from langchain_text_splitters import RecursiveCharacterTextSplitter



app = FastAPI()



class ModelLoader():
    __instance = None
    
    def get_model(self):
        return self.model , self.tokenizer

    @staticmethod
    def get_instance(path):
        if ModelLoader.__instance is None:

            ModelLoader.__instance = ModelLoader(path)

        else: 
           if ModelLoader.__instance.path != path:
            ModelLoader.__instance = ModelLoader(path)
        return ModelLoader.__instance
    
    def __init__(self ,path) -> None:
        self.path = path
        self.model , self.tokenizer = load(self.path)




app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class Content(BaseModel):
    content : str
    role : str

class Messages(BaseModel):
    pid:List[str]
    messages : List[Content]


class ModelApi(BaseModel):
    messages : Messages
    model : str 

    role_mapping : dict | None   = None 
    stream : bool | None = False
    max_tokens : int | None = 100
    temp : float | None = 0.2
    stream : bool | None = False
    top_p : float | None = 1.0
    repetition_penalty : float | None = 1.0




@app.get('/models' )
async def getModelName(res: Response , path:str|None = "./models"):


    res.headers["Access-Control-Allow-Origin"] = "*"


    return { "models" :[name for name in os.listdir(path) if os.path.isdir(os.path.join(path, name)) and not (name ==  "bert models")] }


def convert_chat(messages: List[Content], role_mapping: Optional[Dict[str, str]] = None) -> str:
    # Set default role_mapping if not provided
    if role_mapping is None:
        role_mapping = {
            "bos": "",
            "system": "system",
            "user": "user",
            "assistant": "assistant",
            "eot": "",
            "eos": ""
        }
    
    try:
        prompt = ""

        # Add beginning of sequence token if exists
        prompt += role_mapping.get("bos", "")

        for line in messages:
            # Get the role prefix and stop token from the mapping
            role_prefix = role_mapping.get(line.role, "")
            stop = role_mapping.get("eot", "")
            content = line.content
            # Add the role prefix, content, and stop token to the prompt
            prompt += f"{role_prefix}{content}{stop}"


    except Exception as e:
        print("\n YOO UO U O FE \n")
        print("Error:", e)
        return ""
        # Add the assistant role prefix at the end
    prompt += role_mapping.get("assistant", "")
    return prompt.rstrip()




@app.get('/check_dir')
async def check_dir(path:str):
    return os.path.isdir(path)

class ChromaDB():
    __instance = None
    
    # def get_model(self):
    #     return self.model , self.tokenizer

    @staticmethod
    def get_chroma():
        if ChromaDB.__instance is None:
            ChromaDB.__instance = ChromaDB()
        return ChromaDB.__instance
    
    def __init__(self ) -> None:
        __instance = None

ChromaDB()


class DictType(TypedDict):
    text: str
    file_name: str
    page_number: Union[int, None]


class FileAPI(BaseModel):
    text: List[DictType]


class MlX_embedding(EmbeddingFunction):

    def __init__(
            self,
            bert_model,
            weights_path,
            ) -> None:
            self.model, self.tokenizer = load_model(bert_model, weights_path)
            
    
    def __call__(self, input: Documents) -> Embeddings:
        # embed the documents somehow
        batch = list(input)
        tokens = self.tokenizer(batch, return_tensors="np", padding=True)
        tokens = {key: mx.array(v) for key, v in tokens.items()}

        _ , pooled = self.model(**tokens)

        return pooled.tolist()





client = chromadb.Client()

collection = client.get_or_create_collection(name="coolmother", embedding_function=MlX_embedding(bert_model="./models/bert models/all-MiniLM-L6-v2", weights_path="./models/bert models/all-MiniLM-L6-v2/model.npz"))

chroma_instances : Dict[str, chromadb.Collection] = {}


client = chromadb.Client()


chroma_instances= {}

def generate_stream(model: nn.Module, tokenizer, prompt: str, temp: float, top_p: float, max_tokens: int, repetition_penalty: float , stop : str):
    for n in stream_generate(model, tokenizer, prompt , max_tokens ,temp =  temp, top_p = top_p, repetition_penalty = repetition_penalty):

        if stop is not None:
            if n is stop:
                break
        yield n



@app.post('/v1/chat/completions')
def generate_text(body:ModelApi , res: Response):

    # response = generate(model, tokenizer,prompt= convert_chat(body.message) , role_mapping = body.role_mapping  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens ) 

    # response = generate(model, tokenizer, encoded_prompt , role_mapping = body.role_mapping  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens )
    
    # print("hi \n\n" , chroma_instances)
    model: nn.Module
    model , tokenizer = ModelLoader.get_instance(body.model).get_model()
    res.headers["Access-Control-Allow-Origin"] = "*"
    stop = None
    prompt = None

    content_list = []
    if len(body.messages.pid) > 0 :
        for pid in body.messages.pid:
            temp_collection = client.get_collection(name=pid)
            res = temp_collection.query(
    query_texts=[body.messages.messages[-1].content],
    n_results=2,
)  
            content_list.append(res)
    
        content_str = ""
        for content in content_list:
            for val, metadata in zip(content["documents"][0], content["metadatas"][0]):
                content_str += f"{val} \n metadata : {metadata} \n\n"
        prompt = body.messages.messages[-1].content 
        body.messages.messages[-1].content = f"""You will receive a question or prompt along with relevant docuemnts. Try to answer the question using the provided documents. You can provided answer with your atomony (without looking at doucments) 
    -----
    PROMPT : {prompt}
    -----
    DOCUMENTS : {content_str}
    ---
    """
    if body.role_mapping != None :
        prompt= convert_chat(body.messages.messages, role_mapping=body.role_mapping)
        stop = body.role_mapping.get("eot", "")
    else:
        try :
            prompt = tokenizer.apply_chat_template(
                    body.messages.messages, tokenize=False, add_generation_prompt=True
                )
        except Exception as e:
            return HTTPException(status_code=501, detail="Issue while tokenizing: " + str(e) )
            
    if body.stream:
        return StreamingResponse( generate_stream(model, tokenizer, prompt=prompt  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens , repetition_penalty = body.repetition_penalty , stop = stop)   , media_type="text/plain") 


    else:
        res = generate(model, tokenizer, prompt=prompt  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens )
        return {"message" : res}


class InstallModel(BaseModel):
    hf_path        : str
    name           : str
    model_path     : str
    quantization   : int



def installModel(body:InstallModel):
    if not body.model_path.strip().endswith("/"):
        body.model_path = body.model_path.strip() + "/"
    path = body.model_path.strip() + body.name
    try :
        os.mkdir(path)
    except FileExistsError as e:
        pass
    except Exception as e:
        yield f"error: {e} , Happen when creating the folder"
        return
    yield "downloading"
    try :
        snapshot_download(resume_download=True,repo_id=body.hf_path, local_dir=path)
    except Exception as e:
        yield f"error: {e} , Happen when downloading the model"
        return
    if body.quantization > 0 :
        yield "quantazation"
        try :
            convert(hf_path=body.hf_path,mlx_path=body.model_path, quantize=True , q_bits=body.quantization)
        except Exception as e:
            yield f"error: {e} , Happen when quantazation the model"
            return
    yield "done"
    return

@app.post('/add_models')
def addModels(body:InstallModel):
    return StreamingResponse(installModel(body) , media_type="text/plain")










@app.post("/delete_vdb/")
def delete_vdb(pid:str):
    try :
        client.delete_collection(name=pid)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error deleting collection: {str(e)}")

    return {"message" : "success"}


@app.post("/create_vdb/")
async def testone(file: UploadFile = File(...)):
    try :
        filename = file.filename
        file_extension = filename.split(".")[-1].lower()
        message: Dict[int, str] = {}

        if file_extension == "pdf":
            try:
                contents = await file.read()
                pdf_file = io.BytesIO(contents)
                pdf_reader = PdfReader(pdf_file)


                for i, page in enumerate(pdf_reader.pages):
                    text = page.extract_text()
                    message[i + 1] = text
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Error processing PDF file: {str(e)}")
        else:
            try:
                contents = await file.read()
                message[0] = contents.decode("utf-8")
            except Exception as e:
                raise HTTPException(status_code=500, detail=f"Issue while reading: {str(e)}")
        

        pid = cuid.slug()

        collection = client.create_collection(name=pid, embedding_function=MlX_embedding(bert_model="./models/bert models/all-MiniLM-L6-v2", weights_path="./models/bert models/all-MiniLM-L6-v2/model.npz"))

        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=1500,

            chunk_overlap=200,
            length_function=len,
            is_separator_regex=False,
        )

        metadata_list = []
        text_list = []
        ids_list = []
        for (page_num , text) in message.items():
            texts = text_splitter.create_documents([text])
            for i in range(len(texts)):
                id = f"{page_num}_{i+1}"
                text_list.append(texts[i].page_content)
                if page_num == 0:
                    metadata_list.append({"file_name": filename})
                else:
                    metadata_list.append({"page_number": page_num, "file_name": filename})
                ids_list.append(id)
            
        

        collection.upsert(
            documents=text_list,
            metadatas=metadata_list,
            ids=ids_list
        )
        

        return {"pid": pid}

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")



@app.get("/")
def read_root():
    return {"Hello": "world"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000 , reload=True ,log_level="info" )
# if __name__ == "__main__":
#     app.run(debug=True)
