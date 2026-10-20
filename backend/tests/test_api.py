import pytest

import main

ORIGIN = "http://localhost:5173"


def chat_body(model="./models/tiny-model", **kw):
    body = {"messages": {"pid": [], "messages": [{"role": "user", "content": "hi"}]}, "model": model}
    body.update(kw)
    return body


# --- path traversal ---------------------------------------------------------

@pytest.mark.parametrize("path", ["../", "./models/../../outside", "/etc", "models/../.."])
def test_models_rejects_traversal(client, path):
    assert client.get("/models", params={"path": path}).status_code == 400


@pytest.mark.parametrize("path", ["../", "/etc", "./models/../../outside"])
def test_check_dir_rejects_traversal(client, path):
    r = client.get("/check_dir", params={"path": path})
    assert r.status_code == 200 and r.json() is False


def test_check_dir_ok(client):
    assert client.get("/check_dir", params={"path": "./models/"}).json() is True
    assert client.get("/check_dir", params={"path": "./models/missing"}).json() is False


@pytest.mark.parametrize("model", ["./models/../../outside", "/etc", "./models", "./models/"])
def test_chat_rejects_bad_model_path(client, model, gen):
    r = client.post("/v1/chat/completions", json=chat_body(model))
    assert r.status_code == 400
    assert gen.loads == []


@pytest.mark.parametrize("name", ["../evil", "a/b", ".hidden", "", "..", "x\\y"])
def test_add_models_rejects_bad_name(client, name, monkeypatch):
    monkeypatch.setattr(main, "snapshot_download", lambda **kw: pytest.fail("should not download"))
    r = client.post("/add_models", json={"hf_path": "a/b", "name": name, "model_path": "./models/", "quantization": 0})
    assert r.status_code == 400


def test_add_models_rejects_bad_model_path(client, monkeypatch):
    monkeypatch.setattr(main, "snapshot_download", lambda **kw: pytest.fail("should not download"))
    r = client.post("/add_models", json={"hf_path": "a/b", "name": "ok", "model_path": "../../outside", "quantization": 0})
    assert r.status_code == 400


# --- CORS -------------------------------------------------------------------

def test_cors_allowed_origin(client):
    r = client.options("/models", headers={"Origin": ORIGIN, "Access-Control-Request-Method": "GET"})
    assert r.status_code == 200
    assert r.headers["access-control-allow-origin"] == ORIGIN


def test_cors_disallowed_origin(client):
    evil = "http://evil.example"
    r = client.options("/models", headers={"Origin": evil, "Access-Control-Request-Method": "GET"})
    assert r.status_code == 400
    assert "access-control-allow-origin" not in r.headers
    r = client.get("/models", headers={"Origin": evil})
    assert "access-control-allow-origin" not in r.headers


# --- /models ----------------------------------------------------------------

def test_models_listing(client):
    for p in ["./models", "./models/", None]:
        params = {"path": p} if p else {}
        assert client.get("/models", params=params).json() == {"models": ["tiny-model"]}


def test_models_missing_dir(client):
    assert client.get("/models", params={"path": "./models/nope"}).status_code == 404


# --- add_models -------------------------------------------------------------

def install(client, **kw):
    body = {"hf_path": " mlx-community/x ", "name": "new-model", "model_path": "./models/", "quantization": 0}
    body.update(kw)
    return client.post("/add_models", json=body)


def test_add_models_statuses_and_token(client, models_dir, monkeypatch):
    calls = {}
    monkeypatch.setattr(main, "snapshot_download", lambda **kw: calls.setdefault("dl", kw))
    monkeypatch.setattr(main, "convert", lambda **kw: calls.setdefault("convert", kw))
    r = install(client, quantization=4, hf_token="  hf_secret123  ")
    assert r.status_code == 200
    assert r.text.splitlines() == ["downloading", "quantazation", "done"]
    assert calls["dl"]["token"] == "hf_secret123"
    assert calls["dl"]["repo_id"] == "mlx-community/x"
    assert calls["dl"]["local_dir"] == models_dir / "new-model"
    assert calls["convert"]["q_bits"] == 4
    assert calls["convert"]["mlx_path"] == f"{models_dir / 'new-model'}-q4"
    assert "hf_secret123" not in r.text


def test_add_models_no_token_passes_none(client, monkeypatch):
    calls = {}
    monkeypatch.setattr(main, "snapshot_download", lambda **kw: calls.setdefault("dl", kw))
    r = install(client, hf_token="   ")
    assert r.text.splitlines() == ["downloading", "done"]
    assert calls["dl"]["token"] is None


def test_add_models_error_scrubs_token(client, monkeypatch):
    def boom(**kw):
        raise RuntimeError(f"401 Unauthorized for token {kw['token']}\nsecond line")
    monkeypatch.setattr(main, "snapshot_download", boom)
    r = install(client, hf_token="hf_secret123")
    lines = r.text.splitlines()
    assert lines[0] == "downloading"
    assert lines[1].startswith("error: 401 Unauthorized") and "***" in lines[1]
    assert len(lines) == 2
    assert "hf_secret123" not in r.text


def test_install_model_repr_hides_token():
    m = main.InstallModel(hf_path="a", name="b", model_path="c", quantization=0, hf_token="hf_secret123")
    assert "hf_secret123" not in repr(m)


def test_add_models_negative_quantization(client):
    assert install(client, quantization=-1).status_code == 400


# --- chat -------------------------------------------------------------------

def test_chat_streaming(client, gen):
    r = client.post("/v1/chat/completions", json=chat_body(stream=True))
    assert r.status_code == 200
    assert r.headers["content-type"].startswith("text/plain")
    assert r.text == "Hello!"
    assert gen.prompts == ["<user>hi<assistant>"]


def test_chat_non_streaming(client, gen):
    r = client.post("/v1/chat/completions", json=chat_body())
    assert r.json() == {"message": "Hello!"}


def test_chat_model_cached(client, gen):
    client.post("/v1/chat/completions", json=chat_body())
    client.post("/v1/chat/completions", json=chat_body())
    assert len(gen.loads) == 1


def test_chat_missing_model(client):
    assert client.post("/v1/chat/completions", json=chat_body("./models/nope")).status_code == 404


def test_chat_load_error(client, monkeypatch):
    def bad(path):
        raise ValueError("bad weights")
    monkeypatch.setattr(main, "load", bad)
    r = client.post("/v1/chat/completions", json=chat_body())
    assert r.status_code == 500 and "bad weights" in r.json()["detail"]


ROLE_MAPPING = {"bos": "<s>", "system": "S:", "user": "U:", "assistant": "A:", "eot": "<eot>", "eos": ""}


def test_chat_role_mapping_prompt(client, gen):
    client.post("/v1/chat/completions", json=chat_body(stream=True, role_mapping=ROLE_MAPPING))
    assert gen.prompts == ["<s>U:hi<eot>A:"]


# --- stop tokens ------------------------------------------------------------

def test_stream_stops_at_stop_token(client, gen):
    gen.chunks = ["Hi", " there", "<eot>", "U:", "leak"]
    r = client.post("/v1/chat/completions", json=chat_body(stream=True, role_mapping=ROLE_MAPPING))
    assert r.text == "Hi there"


def test_stream_stop_token_inside_chunk(client, gen):
    gen.chunks = ["Hi", " there<eot>U:", "leak"]
    r = client.post("/v1/chat/completions", json=chat_body(stream=True, role_mapping=ROLE_MAPPING))
    assert r.text == "Hi there"


def test_non_stream_truncates_at_stop_token(client, gen):
    gen.text = "Hi there<eot>U:leak"
    r = client.post("/v1/chat/completions", json=chat_body(role_mapping=ROLE_MAPPING))
    assert r.json() == {"message": "Hi there"}


def test_no_stop_without_role_mapping(client, gen):
    gen.chunks = ["a", "<eot>", "b"]
    r = client.post("/v1/chat/completions", json=chat_body(stream=True))
    assert r.text == "a<eot>b"


# --- vector DB --------------------------------------------------------------

def test_create_vdb_too_large(client, monkeypatch):
    monkeypatch.setattr(main, "MAX_UPLOAD_BYTES", 10)
    r = client.post("/create_vdb/", files={"file": ("a.txt", b"x" * 11, "text/plain")})
    assert r.status_code == 413


def test_create_vdb_empty(client):
    r = client.post("/create_vdb/", files={"file": ("a.txt", b"  \n ", "text/plain")})
    assert r.status_code == 400


def test_create_vdb_and_chat_with_rag(client, gen):
    r = client.post("/create_vdb/", files={"file": ("doc.txt", b"The sky is green on Mars.", "text/plain")})
    assert r.status_code == 200
    pid = r.json()["pid"]
    body = chat_body()
    body["messages"]["pid"] = [pid]
    assert client.post("/v1/chat/completions", json=body).status_code == 200
    assert "The sky is green on Mars." in gen.prompts[-1]
    assert client.post("/delete_vdb/", params={"pid": pid}).json() == {"message": "success"}


def test_chat_unknown_pid(client):
    body = chat_body()
    body["messages"]["pid"] = ["nope"]
    assert client.post("/v1/chat/completions", json=body).status_code == 404


def test_delete_vdb_missing(client):
    assert client.post("/delete_vdb/", params={"pid": "doesnotexist"}).status_code == 404


@pytest.mark.parametrize("bits", [1, 7, 9, 16, 999])
def test_add_models_rejects_unsupported_bits(client, bits, monkeypatch):
    monkeypatch.setattr(main, "snapshot_download", lambda **kw: pytest.fail("should not download"))
    r = install(client, quantization=bits)
    assert r.status_code == 400
    assert "Invalid quantization" in r.json()["detail"]


@pytest.mark.parametrize("bits", [2, 3, 4, 5, 6, 8])
def test_add_models_accepts_supported_bits(client, bits, monkeypatch):
    monkeypatch.setattr(main, "snapshot_download", lambda **kw: None)
    monkeypatch.setattr(main, "convert", lambda **kw: None)
    assert install(client, quantization=bits).text.splitlines()[-1] == "done"


def test_add_models_refuses_to_requantize(client, models_dir, monkeypatch):
    def fake_download(local_dir, **kw):
        local_dir.mkdir(parents=True, exist_ok=True)
        (local_dir / "config.json").write_text('{"quantization": {"bits": 4, "group_size": 64}}')
    monkeypatch.setattr(main, "snapshot_download", fake_download)
    monkeypatch.setattr(main, "convert", lambda **kw: pytest.fail("should not convert"))
    lines = install(client, quantization=4).text.splitlines()
    assert lines[0] == "downloading"
    assert lines[-1].startswith("error: This model is already quantized")
