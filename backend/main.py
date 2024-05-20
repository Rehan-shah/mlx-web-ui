from re import UNICODE
from typing import List, Optional
from huggingface_hub import snapshot_download
from mlx_lm import generate , load
from mlx_lm.utils import generate_step
from pydantic import BaseModel
import json
import uvicorn
import os
from fastapi.middleware.cors import CORSMiddleware
import mlx.core as mx
from fastapi import FastAPI , Response ,  HTTPException
from fastapi.responses import StreamingResponse
import mlx.nn as nn
from mlx_lm.utils import convert


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

class ModelApi(BaseModel):
    messages : List[dict]
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


    return { "models" :[name for name in os.listdir(path) if os.path.isdir(os.path.join(path, name))]}


def get_stream(prompt:str , model , tokenizer , stream : bool = False ,temp: float = 0.7,repetition_penalty: Optional[float] = None,repetition_context_size: Optional[int] = 20,top_p: float = 1.0  ,max_tokens: int = 256 , stop:Optional[str] = ""):

    encoded_prompt = mx.array(tokenizer.encode(prompt))
    res = ""
    tokens = []
    prevLen = 0 
    for (token, _prob) , n in zip(generate_step(encoded_prompt, model , temp = temp,repetition_penalty = repetition_penalty,repetition_context_size = repetition_context_size,top_p = top_p) , range(max_tokens)):


        prevLen = len(res)
        if  tokenizer.eos_token_id == token:
            break
        tokens.append(token)
        res = tokenizer.decode(tokens)

        if res[prevLen:] == stop:
            break
        if  "�" not in res:
            if stream:
                yield res[prevLen:] 
        else :
            hi , _ = res.split("�")
            res = hi
    if stream:
        return res




@app.get("/test" )
def test():
    # os.system("python -m mlx_lm.convert --hf-path mlx-community/Meta-Llama-3-8B-Instruct-4bit --mlx-path ./models/Llama-3-8b-Instruct-Q8 -q --q-bits 1 ")
    return "test"


def convert_chat(messages: List[dict], role_mapping: Optional[dict] = {
        "bos": "<|begin_of_text|>",
        "system": "<|start_header_id|>system<|end_header_id|>",
        "user": "<|start_header_id|>user<|end_header_id|>",
        "assistant": "<|start_header_id|>assistant<|end_header_id|> ",
        "eot": "<|eot_id|>",
        "eos": "<|end_of_text|>",
        
    }
) -> str:

    prompt = ""
    
    prompt += role_mapping.get("bos", "")

    for line in messages:
        role_prefix = role_mapping.get(line["role"], "")
        stop = role_mapping.get("eot", "")
        content = line.get("content", "")
        prompt += f"{role_prefix}{content}{stop}"

    prompt += role_mapping.get("assistant", "")
    return prompt.rstrip()




@app.get('/check_dir')
async def check_dir(path:str):
    return os.path.isdir(path)



@app.post('/v1/chat/completions' )
def generate_text(body:ModelApi , res: Response):

    # response = generate(model, tokenizer,prompt= convert_chat(body.message) , role_mapping = body.role_mapping  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens ) 

    # response = generate(model, tokenizer, encoded_prompt , role_mapping = body.role_mapping  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens )
    
    model: nn.Module
    model , tokenizer = ModelLoader.get_instance(body.model).get_model()
    res.headers["Access-Control-Allow-Origin"] = "*"
    stop = None
    prompt = None
    if body.role_mapping != None :
        prompt= convert_chat(body.messages , role_mapping=body.role_mapping)
        stop = body.role_mapping.get("eot", "")
    else:
        try :
            prompt = tokenizer.apply_chat_template(
                    body.messages, tokenize=False, add_generation_prompt=True
                )
        except Exception as e:
            return HTTPException(status_code=501, detail="Issue while tokenizing: " + str(e) )

    if body.stream:
        return StreamingResponse(get_stream(prompt ,  model, tokenizer , stream = body.stream ,temp = body.temp , top_p = body.top_p , max_tokens=body.max_tokens , stop=stop)  , media_type="text/plain") 


    else:
        res = generate(model, tokenizer, prompt= prompt  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens )
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
        snapshot_download(repo_id=body.hf_path, local_dir=path)
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

@app.get("/")
def read_root():
    return {"Hello": "world"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000 , reload=True ,log_level="info" )
# if __name__ == "__main__":
#     app.run(debug=True)
