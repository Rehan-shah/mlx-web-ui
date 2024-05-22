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
import { createContext, useContext } from 'react';
export const AlertContext = createContext(null);

import 'katex/dist/katex.min.css'
import { CirclePause } from 'lucide-react';

export type conv = { role: "system" | "user" | "assistant", content: string }

import Markdown from 'react-markdown'
import AlertToast from './components/ui/toast';
import Installtion from './Installtion';

import rehypeKatex from 'rehype-katex'
import remarkMath from 'remark-math'
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
            <Markdown className='col-span-11 text-left text-sm  w-full text-wrap'
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex]}
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

    const loadingRef = useRef(false)
    const [loading, setLoading] = useState(false)
    const recevingRef = useRef(false)
    const [receiving, setReceiving] = useState(false)
    useEffect(() => {
        setReceiving(recevingRef.current)
        console.log(recevingRef.current)
    }, [recevingRef.current])

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

    const [_, setAlert] = useContext(AlertContext)

    const abortController = new AbortController();
    const handelReq = async () => {

        setLoading(true)
        setConv([...Conv, { role: "user", content: input }]);
        let tempInput = input;
        setInput("");
        setConv((prevCon) => [...prevCon, { role: "assistant", content: "Loading ..." }]);
        try {
            let config = JSON.parse(localStorage.getItem(`config_${model}`));
            let defaultConfig = JSON.parse(localStorage.getItem("default"));
            if (config == null) {
                config = defaultConfig
            }
            if (config.show_role_mapping) {
                body["role_mapping"] = config.role_mapping;
            }

            const body = {
                messages: [...Conv, { role: "user", content: tempInput }],
                model: defaultConfig.path + model,
                stream: true,
                max_tokens: config.max_tokens,
                temp: config.temp,
                top_p: config.top_p,
            };
            const response = await fetch("http://localhost:8000/v1/chat/completions", {
                method: "POST",
                signal: abortController.signal,
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(body)
            });


            if (response.body === null) {
                return;
            }
            const reader = response.body
                .pipeThrough(new TextDecoderStream())
                .getReader();
            setConv((preConv) => {
                return [...preConv, { role: "assistant", content: "" }];
            });
            let assistantResponse = "";

            setConv((prevCon) => prevCon.slice(0, -1));
            let i = 0
            let midTime = 0
            let endTime = 0
            while (true) {

                if (i < 1) {
                    midTime = Date.now()
                    setLoading(false)
                    recevingRef.current = true
                }

                let { value, done } = await reader.read();

                i++
                if (value?.includes("status_code")) {
                    console.error(JSON.parse(value));
                    throw new Error("value");
                }

                if (!recevingRef.current) {
                    abortController.abort();
                    endTime = Date.now()
                    break;
                }
                if (done) {

                    endTime = Date.now()
                    recevingRef.current = false

                    break;
                }

                assistantResponse += value;
                setConv((preConv) => [...preConv.slice(0, -1), { role: "assistant", content: assistantResponse }]);
            }
            console.log(midTime, endTime)
            console.log(i)
            console.log(midTime, endTime - midTime,)
        } catch (error) {
            setAlert("unable to send request , check console logs for more info");
            setLoading(false)
            recevingRef.current = false
            setConv((prevCon) => prevCon.slice(0, -2));
        }
    };

    return (
        <div className=' m-3 bg-white flex p-1 w-full px-2  mx-auto rounded-xl justify-center border border-gray-400 shadow-gray-200 shadow-sm items-end '>
            <TextareaAutosize
                placeholder='Type here'
                className='w-full disabled:opacity-50  resize-none rounded-lg p-2 focus:outline-none max-h-96'
                value={input}
                onChange={(e) => { setInput(e.target.value) }}
                onKeyDown={(loadingRef.current) ? () => { } : ((evt) => {
                    if (evt.key == "Enter" && evt.shiftKey) {
                        if (evt.type == "keypress") {
                            pasteIntoInput(this, "\n");
                        }
                    } else if (evt.key == "Enter") {
                        evt.preventDefault();

                        handelReq();

                        return;
                    }
                })}
            ></TextareaAutosize>

            <button
                className='disabled:opacity-50  w-[20px] h-[20px] m-[10px] flex flex-row justify-center items-center'
                onClick={receiving ? () => { recevingRef.current = false } : () => { console.log("fje"); handelReq() }} // Call handelReq with trueS
            >
                <div
                    className={'rounded-md p-[3px] ' + ((!loading) ? "bg-black" : "bg-gray-100")}


                >
                    {(!recevingRef.current) ? <svg
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        className={"text-white"}
                    >
                        <path
                            d="M7 11L12 6L17 11M12 18V7"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        ></path>
                    </svg>

                        : <CirclePause className='text-white' width={24} height={24} />
                    }
                </div>
            </button>
        </div >
    );
}



export function ModelSelection({ model, setModel }: { model: string, setModel: React.Dispatch<React.SetStateAction<string>> }) {

    const [show, setShow] = useState(false)
    const [_, setAlert] = useContext(AlertContext)
    const [data, setData] = useState<string[]>([])

    useEffect(() => {
        if (show) {
            const config = JSON.parse(localStorage.getItem("default") || "{}")
            fetch(URL + `/models?path=${config.path}`, {
                method: "GET",
                cache: "force-cache"
            }).then((data) =>
                data.json().then((data) => {
                    setData(data.models)
                })).catch((err) => {
                    setAlert("Failed to fetch models check console for details")
                })
        }
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
            {show && (
                <Command open={show} onClose={() => setShow(false)} className='w-72  border border-gray-300 shadow-gray-500 shadow-xs h-fit absolute z-10 text-sm'>
                    <CommandInput placeholder="Type the model name..." />
                    <CommandList>
                        <CommandEmpty>
                            <p>No results found</p>
                            <Installtion />
                        </CommandEmpty>
                        {!!data ? <CommandGroup heading="Suggestions" className='text-left'>
                            {data.map((data, index) => <CommandItem key={index}
                                onSelect={() => {
                                    setModel(data)
                                    setShow(false)
                                }
                                }>{data}</CommandItem>)}

                        </CommandGroup> :
                            <CommandItem>Loading...</CommandItem>}
                        <CommandSeparator />
                    </CommandList>
                </Command >
            )
            }
        </>
    )
}


function TestButton() {
    const [list, setList] = useState<string[]>(["1", "2", "3"])
    return (
        <>
            <div className='overflow-y-scroll h-10' ref={(e) => e?.scrollTo({ top: e.scrollHeight, behavior: "smooth" })}>
                {list.map((data, index) => <div key={index}>{data}</div>)}
            </div>
            <button onClick={() => setList([...list, "4"])} >Add new</button>
        </>
    )
}


function Alert({ children }: { childern: Element }) {
    const [alert, setAlert] = useState("")
    const [open, setOpen] = useState(false)
    useEffect(() => {
        if (alert !== "") {
            setOpen(true)
            setTimeout(() => {
                setOpen(false)
                setAlert("")
            }, 3000)
        }
    }, [alert])
    return (
        <>
            <AlertContext.Provider value={[alert, setAlert]}>

                <AlertToast open={open} setOpen={setOpen} title={alert}></AlertToast>

                {children}
            </AlertContext.Provider >
        </>
    )
}



function IntroductionOverlay({ setShow }) {
    const inputRef = useRef(null);
    const [_, setAlert] = useContext(AlertContext);
    const dir = {
        path: "./models",
        systemPrompt: "A chat between a curious user and an artificial intelligence assistant. The assistant follows the given rules no matter what.",
        temp: 0.7,
        top_p: 1,
        max_tokens: 256,
        show_role_mapping: false
    };

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50">
            <div className="absolute inset-0 bg-black opacity-50 pointer-events-none"></div>
            <div className="w-1/3 p-8 bg-white rounded-lg drop-shadow-md z-100 relative">
                <h1 className="text-2xl font-bold">Welcome to MLX web ui</h1>
                <p className="text-sm py-2">
                    Before starting, please enter your folder path where your models are saved/will be saved.
                    If you enter a relative path, make it relative to the backend folder in the mlx-web-ui folder.
                    <br />
                    <p>
                        ./models is the defualt dir , u can countuine with that
                    </p>
                </p>
                <div className="py-4"></div>
                <input
                    ref={inputRef}
                    defaultValue={"./models"}
                    placeholder="Enter your path"
                    className="w-72 h-12 rounded p-2 mb-4 z-100 relative pointer-events-auto focus:outline-none"
                    type="text"
                />
                <button
                    className="bg-black text-white rounded text-md p-1 z-100 relative pointer-events-auto"
                    onClick={async () => {
                        const res = await fetch("http://localhost:8000/check_dir?path=" + (inputRef.current?.value || ""), {});
                        let isDir = (await res.json())
                        if (!isDir) {
                            setAlert("Invalid path, please try again");
                        } else {
                            let value = (inputRef.current?.value || "").trim()
                            if (!value.endsWith("/")) value += "/"
                            dir.path = value;

                            localStorage.setItem("default", JSON.stringify(dir));
                            setShow(false);
                            console.log("saved");
                        }
                    }}
                >
                    Submit
                </button>
            </div>
        </div>
    );
}

function App() {

    const [systemPrompt, setSystemPrompt] = useState<string>("")
    const [input, setInput] = useState("")
    const [_, setAlert] = useContext(AlertContext)
    const [intro, setIntro] = useState(false)
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

    const [model, setModel] = useState<string>("")
    useEffect(() => {
        if (intro) return
        let config = JSON.parse(localStorage.getItem(`config_${model}`) || localStorage.getItem("default"))
        console.log(config, !config)
        console.log(localStorage.getItem("defualt"))

        if (!config) {

            setIntro(true)
        }
        setSystemPrompt(config?.systemPrompt || "")
    }, [model, intro])

    useEffect(() => {
        if (intro) return
        (async () => {
            try {
                let config = JSON.parse(localStorage.getItem("default"))
                const data = await fetch(`${URL}/models?path=${config.path}`, {
                    method: 'GET',
                });
                const res = await data.json();

                if (!res) {
                    return "";
                }
                setModel(res.models[0]);
            } catch (error) {

                setAlert("Failed to load model, Check console for error")
                console.log(error)
            }
        })()

    }, [intro]);



    return (
        <div>
            {intro && <IntroductionOverlay setShow={setIntro} />}
            <div className={'flex h-screen  w-screen  overflow-clip' + (!intro && "blur-sm")}>

                <div className='w-64 '>
                    <Sidebar setConv={setConv} Conv={conv} />
                </div>
                <main className='w-5/6 px-5 pt-4 ' >
                    <ModelSelection setModel={setModel} model={model} />
                    <div className='mx-auto my-0 w-4/6 pt-6'>

                        <div className='h-[80vh] overflow-y-auto ' ref={(e) => e?.scrollTo({ top: e.scrollHeight, behavior: "smooth" })} >
                            {conv
                                .filter((data) => data.role !== "system")
                                .map((data, index) => <Text key={index} text={data.content} type={data.role} />)}

                        </div>
                        <div className='absolute bottom-0 w-[55vw] mb-5'>
                            <Input setConv={setConv} setInput={setInput} input={input} Conv={conv} model={model} />


                            <p className='text-sm text-gray-300 pt-1'>Shift + enter for new line </p>
                        </div>
                    </div>
                </main >
            </div >
        </div >
    )
}







export default function Main() {
    return (
        <>
            <Alert>
                <App />

            </Alert>
        </>
    )
}
