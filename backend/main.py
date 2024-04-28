from typing import List, Optional
from mlx_lm import generate , load
from mlx_lm.utils import generate_step
from pydantic import BaseModel
import json
import uvicorn
import os
from fastapi.middleware.cors import CORSMiddleware
import mlx.core as mx
from fastapi import FastAPI , Response
from fastapi.responses import StreamingResponse
import mlx.nn as nn



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
    role_mapping : dict | None = {
        "bos": "<|begin_of_text|>",
        "system": "<|start_header_id|>system<|end_header_id|>",
        "user": "<|start_header_id|>user<|end_header_id|>",
        "assistant": "<|start_header_id|>assistant<|end_header_id|> ",
        "eot": "<|end_id|>",
        "eos": "<|end_of_text|>",
        
    },
    stream : bool | None = False
    model : str 
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
    final_res = ""
    tokens = []

    for (token, _prob) , n in zip(generate_step(encoded_prompt, model , temp = temp,repetition_penalty = repetition_penalty,repetition_context_size = repetition_context_size,top_p = top_p) , range(max_tokens)):

        inl = len(res)
        tokens.append(token)
        res = tokenizer.decode(tokens)
        final_res += res[inl:]
        if  stop == res[inl:]:
            print("stoped at ",final_res)
            break

        if stream:
            yield res[inl:]
    if not stream:
        return final_res



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

    print(type(role_mapping) , role_mapping)
    prompt = ""
    
    prompt += role_mapping.get("bos", "")

    for line in messages:
        role_prefix = role_mapping.get(line["role"], "")
        stop = role_mapping.get("eot", "")
        content = line.get("content", "")
        prompt += f"{role_prefix}{content}{stop}"

    prompt += role_mapping.get("assistant", "")
    return prompt.rstrip()


class dirModel(BaseModel):
    path : str


@app.get('check_dir' )
def check_dir(body : dirModel):
    return os.path.isdir(body.path)



@app.post('/v1/chat/completions' )
def generate_text(body:ModelApi , res: Response):

    # response = generate(model, tokenizer,prompt= convert_chat(body.message) , role_mapping = body.role_mapping  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens ) 

    # response = generate(model, tokenizer, encoded_prompt , role_mapping = body.role_mapping  ,temp = body.temp , top_p = body.top_p , max_tokens = body.max_tokens )
    
    model: nn.Module
    model , tokenizer = ModelLoader.get_instance(body.model).get_model()

    res.headers["Access-Control-Allow-Origin"] = "*"
    print(body.max_tokens , type(body.max_tokens))
    return StreamingResponse(get_stream(convert_chat(body.messages ,role_mapping=body.role_mapping) ,  model, tokenizer , stream = body.stream ,temp = body.temp , top_p = body.top_p , max_tokens=body.max_tokens , stop=body.role_mapping.get("eot") )) 





@app.get("/")
def read_root():
    return {"Hello": "world"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8000 , reload=True ,log_level="info" )
# if __name__ == "__main__":
#     app.run(debug=True)
