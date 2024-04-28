import { useEffect, useRef, useState } from 'react'
import './App.css'
import React from 'react'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import CodeBlock from './CodeBlock';

import TextareaAutosize from 'react-textarea-autosize';
import Sidebar from './Sidebar';


import { CirclePause } from 'lucide-react';

export type conv = { role: "system" | "user" | "assistant", content: string }

import Markdown from 'react-markdown'
import { stringify } from 'querystring';


export const URL = "http://127.0.0.1:8000"

const headers = {
    'Content-Type': 'application/json',
}

function Text({ text, type }: { text: string, type: "user" | "assistant" }) {

    let url = ""

    if (type === "user") {
        url = "https://avatars.githubusercontent.com/u/65281592?v=4"
    } else {
        url = "https://styles.redditmedia.com/t5_81eyvm/styles/communityIcon_cumnsvx9kzma1.png"
    }
    let main = "grid grid-cols-12 justify-items-start mb-8"

    if (type === "assistant") {
        main += " grid-row-3"
    } else {
        main += " grid-row-2"
    }

    return (
        <div className={main}>

            <div className=' justify-self-end  mr-3 '>
                <img
                    src={url}
                    width={25}
                    className='rounded-full '
                />
            </div>
            <p className='text-left align-middle col-span-11 font-bold '>{type}</p>
            <div />
            <Markdown className='col-span-11 text-left text-sm text-base w-full text-wrap'
                components={{ code: CodeBlock }}
            >{text}</Markdown>
            <div></div>
            {type === "assistant" && <button className='mt-2 hover:opacity-100 opacity-20' onClick={() => navigator.clipboard.writeText(text)}><svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md"><path fill-rule="evenodd" clip-rule="evenodd" d="M12 3.5C10.8954 3.5 10 4.39543 10 5.5H14C14 4.39543 13.1046 3.5 12 3.5ZM8.53513 3.5C9.22675 2.3044 10.5194 1.5 12 1.5C13.4806 1.5 14.7733 2.3044 15.4649 3.5H17.25C18.9069 3.5 20.25 4.84315 20.25 6.5V18.5C20.25 20.1569 19.1569 21.5 17.25 21.5H6.75C5.09315 21.5 3.75 20.1569 3.75 18.5V6.5C3.75 4.84315 5.09315 3.5 6.75 3.5H8.53513ZM8 5.5H6.75C6.19772 5.5 5.75 5.94772 5.75 6.5V18.5C5.75 19.0523 6.19772 19.5 6.75 19.5H17.25C18.0523 19.5 18.25 19.0523 18.25 18.5V6.5C18.25 5.94772 17.8023 5.5 17.25 5.5H16C16 6.60457 15.1046 7.5 14 7.5H10C8.89543 7.5 8 6.60457 8 5.5Z" fill="currentColor"></path></svg></button>}

        </div>

    )
}

function Input({ setInput, setConv, input, Conv, model }:

    {
        setInput: React.Dispatch<React.SetStateAction<string>>,
        setConv: React.Dispatch<React.SetStateAction<conv[]>>,
        input: string,
        Conv: conv[],
        model: string
    }) {

    const [loading, setLoading] = useState(false)
    const [reciving, setReciving] = useState(false)
    function pasteIntoInput(el, text) {
        el.focus();
        if (typeof el.selectionStart == "number"
            && typeof el.selectionEnd == "number") {
            var val = el.value;
            var selStart = el.selectionStart;
            el.value = val.slice(0, selStart) + text + val.slice(el.selectionEnd);
            el.selectionEnd = el.selectionStart = selStart + text.length;
        } else if (typeof document.selection != "undefined") {
            var textRange = document.selection.createRange();
            textRange.text = text;
            textRange.collapse(false);
            textRange.select();
        }
    }


    const handelReq = async () => {

        setConv([...Conv, { role: "user", content: input }])
        let tempInput = input
        setInput("")
        setConv((prevCon) => [...prevCon, { role: "assistant", content: "Loading ..." }])
        setReciving(true)
        let config = JSON.parse(localStorage.getItem(`config_${model}`) || localStorage.getItem("defualt"))
        console.log({
            messages: [...Conv, { role: "user", content: tempInput }],
            model: "./models/" + model,
            stream: true,
            ...config
        })
        const response = await fetch("http://localhost:8000/v1/chat/completions", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(
                {
                    messages: [...Conv, { role: "user", content: tempInput }],
                    model: "./models/" + model,
                    stream: true,
                    max_tokens: config.max_tokens,
                    temp: config.temp,
                    top_p: config.top_p,
                    role_mapping: config.role_mapping

                })
        });



        if (response.body === null) {
            console.log('Response body is null');
            return
        }
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader();
        setConv((preConv) => {
            return [...preConv, { role: "assistant", content: "" }]
        })
        let assistantResponse = "";

        setConv((prevCon) => prevCon.slice(0, -1))
        while (true) {
            const { value, done } = await reader.read();

            if (done || reciving) {
                console.log("done", done, reciving, done || !reciving)
                await reader.cancel();
                console.log("done 2", done, reciving, done || reciving)
                console.log("triggered")
                setReciving(false)
                return
                break;
            }
            assistantResponse += value;
            setConv((preConv) => [...preConv.slice(0, -1), { role: "assistant", content: assistantResponse }]);

        }
    }


    return (
        <div className=' m-3 bg-white flex p-1 w-full px-2  mx-auto rounded-xl justify-center border border-gray-400 shadow-gray-200 shadow-sm items-end '>

            <TextareaAutosize placeholder='Type here' className='w-full disabled:opacity-50  resize-none rounded-lg p-2 focus:outline-none max-h-96' value={input} onChange={(e) => { setInput(e.target.value) }} onKeyDown={(evt) => {


                if (evt.key == "Enter" && evt.shiftKey) {
                    if (evt.type == "keypress") {
                        pasteIntoInput(this, "\n");
                    }
                } else if (evt.key == "Enter") {
                    evt.preventDefault();
                    handelReq()
                    return
                }
            }} ></TextareaAutosize>

            <button className='disabled:opacity-50  w-[20px] h-[20px] m-[10px] flex flex-row justify-center items-center'
                onClick={async () => { setReciving(true); await handelReq() }}
            >
                <div className={'rounded-md p-[3px] ' + ((input !== "" || (reciving || loading)) ? 'bg-black' : 'bg-gray-200')} >
                    {!(reciving || loading) ? <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
                        className={"text-white"}><path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg> : <CirclePause className='text-white' width={24} height={24} />}
                </div>
            </button >
        </div>
    )
}


export function ModelSelection({ model, setModel }: { model: string, setModel: React.Dispatch<React.SetStateAction<string>> }) {

    const [show, setShow] = useState(false)
    const [data, setData] = useState<string[]>([])

    useEffect(() => {
        fetch(URL + "/models?path=./models", {
            method: "GET",
            cache: "default"
        }).then((data) =>
            data.json().then((data) => {
                setData(data.models)
            })).catch((err) => {
                console.log(err)
            })
    }, [show])


    return (
        <>
            <button className='flex justify-start focus:outline-none' onClick={() => setShow(!show)}>
                <div className='inline-flex  flex-row p-2 px-3 items-center gap-1 hover:bg-gray-50 rounded-lg '>

                    <h1 className="text-sm font-bold opacity-70 text-left ">
                        {!!model ? model : "No Model Selected"}
                    </h1>

                    <svg width="17" height="18" viewBox="0 0 16 17" fill="none" className="text-token-text-tertiary opacity-70"><path d="M11.3346 7.83203L8.00131 11.1654L4.66797 7.83203" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>

                </div>
            </button>
            {show && (<Command className=
                'w-72 border border-gray-300 shadow-gray-500 shadow-xs h-fit absolute z-10 text-sm'>
                <CommandInput placeholder="Type the model name..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    {!!data ? <CommandGroup heading="Suggestions" className='text-left'>
                        {data.map((data, index) => <CommandItem key={index} onSelect={() => setModel(data)}  >{data}</CommandItem>)}
                    </CommandGroup> :
                        <CommandItem>Loading...</CommandItem>}
                    <CommandSeparator />
                </CommandList>
            </Command>
            )}
        </>
    )
}


function TestButton() {
    return (
        <>
            <button onClick={async () => {


                const response = await fetch("http://localhost:8000/v1/chat/completions", {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify(
                        { messages: [{ role: "system", content: "You are a helpful assistant." }] })
                });
                const reader = response.body
                    .pipeThrough(new TextDecoderStream())
                    .getReader();
                while (true) {
                    const { value, done } = await reader.read();
                    if (done) break;
                    console.log('Received', value);
                }
                console.log('Response fully received');
            }}>test</button >
        </>
    )
}


function Alert({ children }: { childern: Element }) {

    return (
        <>
            <div className='z-30 absolute bottom-0 left-1/2  mb-5 p-2 px-4 bg-red-500 text-white text-lg rounded-lg '>Hello </div>
            {children}
        </>
    )
}





export default function App() {

    const [systemPrompt, setSystemPrompt] = useState<string>("")
    const [input, setInput] = useState("")
    const [conv, setConv] = useState<conv[]>([
        {
            role: "system", content: systemPrompt
        }, {
            role: "user", content: "Hello, how are you?"
        }
        , {
            role: "assistant",
            content: "I am fine, thank you. How can I help you today?"

        }
    ])

    const [model, setModel] = useState<string>()

    useEffect(() => {
        let config = JSON.parse(localStorage.getItem(`config_${model}`) || localStorage.getItem("defualt"))
        setSystemPrompt(config?.systemPrompt || "")
    }, [model])

    useEffect(() => {
        (async () => {
            try {
                const data = await fetch(`${URL}/models?path=./models`, {
                    method: 'GET',
                });
                const res = await data.json();

                if (!res) {
                    return "";
                }
                setModel(res.models[0]);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
        })()

    }, []);


    const [showSetting, setShowSetting] = useState(false)
    return (
        <Alert>
            <div className='flex h-screen  w-screen  '>
                <div className='w-1/6 '>
                    <Sidebar setConv={setConv} Conv={conv} />
                </div>
                <main className='w-5/6 px-5 pt-4 ' >
                    <ModelSelection setModel={setModel} model={model} />
                    <div className='mx-auto my-0 w-4/6 pt-6'>

                        <div className='h-[80vh] overflow-y-auto '>
                            {conv
                                .filter((data) => data.role !== "system")
                                .map((data, index) => <Text key={index} text={data.content} type={data.role} />)}

                        </div>
                        <div className='absolute bottom-0 w-[55vw] mb-5'>
                            <Input setConv={setConv} setInput={setInput} input={input} Conv={conv} model={model} />


                            <p className='text-sm text-gray-300 pt-1'>Shift + enter for new line </p>
                        </div>
                    </div>
                </main>
            </div>
        </Alert>
    )
}


