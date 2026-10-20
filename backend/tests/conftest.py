import sys
from pathlib import Path
from types import SimpleNamespace

import chromadb
import pytest
from chromadb import EmbeddingFunction
from fastapi.testclient import TestClient

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

import main  # noqa: E402


def pytest_addoption(parser):
    parser.addoption("--runslow", action="store_true", default=False, help="run slow tests")


def pytest_collection_modifyitems(config, items):
    if config.getoption("--runslow"):
        return
    skip = pytest.mark.skip(reason="needs --runslow")
    for item in items:
        if "slow" in item.keywords:
            item.add_marker(skip)


class FakeEmbedding(EmbeddingFunction):
    def __init__(self):
        pass

    @staticmethod
    def name() -> str:
        return "fake-test-embedding"

    def __call__(self, input):
        return [[float(len(d)), float(sum(map(ord, d)) % 97), 1.0] for d in input]


class FakeTokenizer:
    def apply_chat_template(self, messages, tokenize=False, add_generation_prompt=True):
        return "".join(f"<{m['role']}>{m['content']}" for m in messages) + "<assistant>"


@pytest.fixture
def gen(monkeypatch):
    """Records generation calls; set gen.chunks / gen.text to control output."""
    state = SimpleNamespace(chunks=["Hel", "lo", "!"], text="Hello!", prompts=[], loads=[])

    def fake_load(path):
        state.loads.append(path)
        return object(), FakeTokenizer()

    def fake_stream(model, tokenizer, prompt, **kw):
        state.prompts.append(prompt)
        for c in state.chunks:
            yield SimpleNamespace(text=c)

    def fake_generate(model, tokenizer, prompt, **kw):
        state.prompts.append(prompt)
        return state.text

    monkeypatch.setattr(main, "load", fake_load)
    monkeypatch.setattr(main, "stream_generate", fake_stream)
    monkeypatch.setattr(main, "generate", fake_generate)
    monkeypatch.setattr(main.ModelLoader, "_path", None)
    return state


@pytest.fixture
def models_dir(tmp_path, monkeypatch):
    backend = tmp_path / "backend"
    models = backend / "models"
    (models / "bert models").mkdir(parents=True)
    (models / "tiny-model").mkdir()
    (models / ".hidden").mkdir()
    (models / "notes.txt").write_text("x")
    (tmp_path / "outside").mkdir()
    monkeypatch.setattr(main, "BACKEND_DIR", backend)
    monkeypatch.setattr(main, "MODELS_DIR", models)
    return models


@pytest.fixture
def client(models_dir, tmp_path, monkeypatch, gen):
    monkeypatch.setattr(main, "_embedding_fn", FakeEmbedding())
    monkeypatch.setattr(main, "_client", chromadb.PersistentClient(path=str(tmp_path / "chroma")))
    with TestClient(main.app) as c:
        yield c
