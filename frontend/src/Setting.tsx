import React, { useEffect, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Settings, Trash, X } from 'lucide-react';
import { Option } from './Sidebar';
import { ModelSelection } from './App';
import { URL } from './App';
type Role_mappingT = {
    bos: string,
    eos: string,
    system: string,
    user: string,
    assistant: string,
    eot: string,
}

type ModelConfig = {
    kind: 'model',
    model: string,
    role_mapping: Role_mappingT,
    systemPrompt: string,
    temp: number,
    top_p: number,
    max_tokens: number
}

type PathConfig = {
    kind: 'path',
    path: string,
    role_mapping: Role_mappingT,
    systemPrompt: string,
    temp: number,
    top_p: number,
    max_tokens: number
}

type ConfigT = ModelConfig | PathConfig
let role_mappinglist = ["bos", "eos", "system", "user", "assistant", "eot"]
const AlertDialogDemo = () => {
    const [showDefualt, setShowDfualt] = React.useState(false)
    const [modelList, setModelList] = React.useState([])
    const [model, setModel] = React.useState("")
    const [show, setShow] = useState(false)

    let defualtConfig = {
        path: "./models",
        role_mapping: {


            bos: "",
            eos: "",
            system: "ASSISTANT's RULE: ",
            user: "USER: ",
            assistant: "ASSISTANT: ",
            eot: "\n"
        },
        systemPrompt: "A chat between a curious user and an artificial intelligence assistant. The assistant follows the given rules no matter what.",
        temp: 0.7,
        top_p: 1,
        max_tokens: 256
    }
    if (localStorage.getItem("defualt") === null) {
        localStorage.setItem("defualt", JSON.stringify(defualtConfig))
    }

    function onSet() {
        console.log("onsset called", model)
        let config: ConfigT = JSON.parse(localStorage.getItem(`config_${model}`))
        console.log("config", config, showDefualt)

        if (config === null || showDefualt) {
            config = JSON.parse(localStorage.getItem("defualt"))
        }
        if (showDefualt) {
            document.getElementById("path").value = config.path
        }
        Object.keys(config.role_mapping).forEach((key: string) => {
            document.getElementById(key).value = config.role_mapping[key]
        })


        document.getElementById("systemPrompt").value = config.systemPrompt
        document.getElementById("temp").value = config.temp
        document.getElementById("top_p").value = config.top_p
        document.getElementById("max_tokens").value = config.max_tokens
    }


    function handleModelChange() {
        if (!showDefualt) {
            let model = document.getElementById("model")?.value
        } else {
            let path = document.getElementById("path")?.value
        }
        let role_model = {}
        role_mappinglist.forEach((key: string) => {
            role_model[key] = document.getElementById(key)?.value
        })
        let systemPrompt = document.getElementById("systemPrompt")?.value

        let temp = Number(document.getElementById("temp")?.value)

        let top_p = Number(document.getElementById("top_p")?.value)

        let max_tokens = Number(document.getElementById("max_tokens")?.value)

        if (!showDefualt) {
            let config: ConfigT = { model: model, systemPrompt: systemPrompt, role_mapping: role_model, temp: temp, top_p: top_p, max_tokens: max_tokens }

            localStorage.setItem(`config_${model}`, JSON.stringify(config))

        } else {
            let config: ConfigT = { path: path, systemPrompt: systemPrompt, role_mapping: role_model, temp: temp, top_p: top_p, max_tokens: max_tokens }

            localStorage.setItem("defualt", JSON.stringify(config))
        }


    }

    useEffect(() => {

        (async () => {
            try {
                const data = await fetch(`${URL}/models?path=./models`, {
                    method: 'GET',
                });
                const res = await data.json();
                console.log("list", res)
                setModel(res.models[0]);
                setModelList(res.models);

            } catch (error) {
                console.error('Error fetching data:', error);
            }
        })()
    }, []);


    useEffect(() => {


        if (show) {
            (new Promise(r => setTimeout(r, 1))).then(() => {
                onSet()
            })
        }
    }, [show, showDefualt, model])

    return (<AlertDialog.Root onOpenChange={setShow} open={show} >
        <AlertDialog.Trigger asChild>
            <Option text="Settings" Svg={Settings} />
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
            <AlertDialog.Overlay className="bg-blackA6 data-[state=open]:animate-overlayShow bg-black opacity-50 fixed inset-0" />
            <AlertDialog.Content className="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] w-[48vw] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-2 focus:outline-none">
                <div className='flex p-4 justify-between'>
                    <h1 className='text-xl font-bold opacity-70'>Settings</h1>
                    <AlertDialog.Cancel asChild>
                        <X />
                    </AlertDialog.Cancel>
                </div>
                <hr className="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700" />
                <div className='grid grid-cols-4  p-2 opacity-70 '>

                    <div className='mr-5'>
                        <h1 role='button' onClick={() => { setShowDfualt(true) }} className={'p-2 hover:bg-gray-100 rounded-md w-full font-semibold ' + (showDefualt ? "bg-gray-100" : "")}>Defualt</h1>
                        <h1 role='button' onClick={() => { setShowDfualt(false) }} className={'p-2 mt-1 hover:bg-gray-100 rounded-md w-full font-semibold ' + (!showDefualt ? "bg-gray-100" : "")}>Model Spefic </h1>
                    </div>

                    <div className='col-span-3 pt-2'>
                        <div className='flex justify-between'>
                            {!showDefualt ? (
                                <>
                                    <h2 className='bold'>Model Name</h2>
                                    <select id="model" onChange={(e) => {
                                        console.log(e.target.value)
                                        setModel(e.target.value)
                                    }} value={model} className='outline-none px-2'>
                                        {modelList.map((model) => {
                                            return <option key={model} value={model}>{model}</option>
                                        })}
                                    </select> </>) : (
                                <>
                                    <h2>Model directory</h2>
                                    <input type="text" id="path" defaultValue={"./models"} className='outline-none border-black border rounded px-2' />
                                </>
                            )
                            }
                        </div>

                        <div className='py-3'><hr /></div>

                        <div className='flex justify-between '>
                            <h2 className='bold'>System Prompt</h2>
                            <textarea id="systemPrompt" defaultValue={""} className='outline-none border-black border rounded px-2' />
                        </div>



                        <div className='py-3'><hr /></div>

                        <div className='flex justify-between '>
                            <h2 className='bold'>Temperature</h2>
                            <input type="number" id="temp" defaultValue={0.7} className='outline-none border-black border rounded px-2' />
                        </div>
                        <div className='py-3'><hr /></div>

                        <div className='flex justify-between '>
                            <h2 className='bold'>Top P</h2>
                            <input type="number" id="top_p" defaultValue={1} className='outline-none border-black border rounded px-2' />
                        </div>

                        <div className='py-3'><hr /></div>

                        <div className='flex justify-between '>
                            <h2 className='bold'>Max token</h2>
                            <input type="number" id="max_tokens" defaultValue={256} className='outline-none border-black border rounded px-2' />
                        </div>

                        <div className='py-3'><hr /></div>
                        <div className='flex justify-between w-full'>
                            <h2>Role Modeling</h2>
                            <div className='w-50'>
                                {role_mappinglist.map((role, i) => (
                                    <div className='grid grid-cols-3 w-50 mb-2' key={i}> <p className='left mr-2'>{role.toUpperCase()}</p> <input type="text" defaultValue="" id={role} className='w-35 col-span-2 border border-black rounded focus:outline-none pd-1' /> </div>
                                ))}
                            </div>
                        </div>

                        <button onClick={handleModelChange} className='w-full bg-black text-white mt-6 h-10 hover:bg-white hover:text-black hover:border hover:border-black rounded-md'>Save</button>
                    </div>

                </div>

            </AlertDialog.Content>
        </AlertDialog.Portal>
    </AlertDialog.Root>)
};

export default AlertDialogDemo;
