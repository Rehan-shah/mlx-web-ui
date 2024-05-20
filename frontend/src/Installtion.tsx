import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { X, CircleX, CircleCheck } from "lucide-react"

import { useEffect, useState, useRef } from "react"
import React from "react"


type ConfigInst = {
    name: string,
    hf_name: string,
    quantization: number
    target_dir: string
}
const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
};


async function installSend(
    stopRef: React.MutableRefObject<boolean>, config: ConfigInst, setInstall: React.Dispatch<React.SetStateAction<string>>
) {

    try {

        const body = {
            name: config.name,
            hf_path: "mlx-community/" + config.hf_name,
            quantization: config.quantization,
            model_path: config.target_dir
        }
        const abortController = new AbortController();

        const response = await fetch("http://localhost:8000/add_models", {
            method: "POST",
            signal: abortController.signal,
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify(body)
        });


        if (response.body === null) {
            return
        }
        const reader = response.body
            .pipeThrough(new TextDecoderStream())
            .getReader();

        while (true) {
            const { value, done } = await reader.read();
            if (value?.includes("status_code")) {
                throw new Error(value)
            }


            if (value !== undefined) {
                setInstall(value)
            }

            if (stopRef.current) {

                abortController.abort();
                stopRef.current = false
                return
            }

            if (done) {
                break;
            }

        }
    } catch (error) {

        console.error(error)

    }
}



type valueZ = `error: ${string}`
type valueT = "" | "downloading" | "quantazation" | "done" | valueZ

function InstallItem({ title, caption, enable }: { title: string, caption: string, enable: boolean }) {

    return (
        <>
            {enable ?
                <div className="flex gap-2">
                    <div>
                        <div
                            className="inline-block mt-1 h-6 w-6 animate-spin rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white "
                            role="status">
                            <span
                                className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]"
                            >Loading...</span
                            >
                        </div>
                    </div>
                    <div>
                        <div className="flex gap-2">

                            <h1 className="text-3xl font-semibold ">{title}</h1>
                        </div>
                        <p>Currently {caption}. For more details check in the terminal</p>
                    </div>
                </div>
                :

                <div className="flex gap-2">
                    <div>
                        <div
                            className="inline-block mt-1 h-6 w-6 opacity-0 rounded-full border-4 border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white "
                            role="status">
                            <span
                                className="!absolute !-m-px !h-px !w-px !overflow-hidden !whitespace-nowrap !border-0 !p-0 ![clip:rect(0,0,0,0)]"
                            >Loading...</span
                            >
                        </div>
                    </div>
                    <div>
                        <h2 className="text-2xl opacity-70">{title}</h2>
                        <p className="opacity-70">{caption}</p>

                    </div>
                </div>
            }
        </>
    )
}

function InstallLogoItem({ Icon, text, color, caption }: { Icon: LucideIcon, text: string, color: string, caption: string }) {

    return (
        <div className="flex flex-col justify-center items-center m-4" >
            <Icon size={50} className={color} />


            <h1 className="text-2xl font-semibold p-2">{text}</h1>
            <p className="text-sm">{caption}</p>
        </div>
    )

}


function InstallView({ config, value, stopRef, setNewView, setInstall, setModelName }: {
    config: ConfigInst, value: valueT, stopRef: React.MutableRefObject<boolean>, setNewView: React.Dispatch<React.SetStateAction<"hf" | "llm" | "install">>,
    setInstall: React.Dispatch<React.SetStateAction<valueT>>,
    setModelName: React.Dispatch<React.SetStateAction<string>>
}) {
    return (
        <>
            <div className="flex mb-4 rounded-md items-center bg-blue-500 text-white text-xs font-bold px-4 py-3" role="alert">

                <svg className="fill-current w-4 h-4 mr-2" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z" /></svg>
                <p>You can press the cross icon to exit the view . It will NOT STOP the downloading process </p>
            </div>
            <div className="h-52 opacity-70 ">
                {(value === "") ?
                    <h1 className="text-2xl opacity-100">Loading ...</h1> :
                    (value === "done") ? <InstallLogoItem Icon={CircleCheck} caption={`Added ${config.name} model to ${config.target_dir}`} color="text-green-500" text="Succesfully Downloaded" /> :
                        (value.includes("error:")) ? <InstallLogoItem Icon={CircleX} caption={value.split(":")[1]} color="text-red-500" text="Error Occured" /> :
                            <>
                                <InstallItem title={`Downloading ${config.name}`} caption={`downloading ${config.hf_name} repo from hf`} enable={value == "downloading"} />
                                <br />
                                {config.quantization > 0 &&
                                    <InstallItem title={`Quantazation ${config.name}`} caption={`Applying ${config.quantization} bit Quantization`} enable={value == "quantazation"} />}
                            </>
                }
            </div >

            <button
                onClick={() => {
                    setNewView("hf")
                    setModelName("")
                    setInstall("")
                    stopRef.current = true
                }}

                className="p-2 mt-8 text-white bg-red-500 rounded-lg w-full">
                Abort and restart
            </button >
        </>
    )
}




function Content({ newView, list, setConfig, config, setNewView, getItem, modelName, setModelName, install, stopRef }: {

    newView: "hf" | "llm" | "install", list: string[], setConfig: React.Dispatch<React.SetStateAction<ConfigInst>>, config: ConfigInst,
    setNewView: React.Dispatch<React.SetStateAction<"hf" | "llm" | "install">>,
    getItem: () => void,
    modelName: string,
    setModelName: React.Dispatch<React.SetStateAction<string>>,
    install: string,
    stopRef: React.MutableRefObject<boolean>
}) {




    switch (newView) {
        case "hf":
            return (
                <div className="h-52">
                    <input placeholder="Enter model name here" onChange={(e) => setModelName(e.target.value)} className="w-full outline-none p-2 text-lg" />
                    {list.map((item, i) => <p key={i} onClick={() => { setConfig({ ...config, hf_name: item }); setModelName(item); setNewView("llm") }} className="hover:bg-gray-100 cursor-pointer p-2 rounded-md">{item}</p >)
                    }
                    <button className="p-2 bg-black text-white rounded-lg mt-4 w-full hover:text-black hover:bg-white border border-black" onClick={async () => { await getItem() }}>View more (we recomend using seach bar instead)</button>
                </div>
            )
        case "llm":

            return (
                <div className="px-2">
                    <p className="py-2 text-md flex gap-[4.5rem]">HF Name : <p>mlx-community\{config.hf_name}</p></p >
                    <div className="flex text-md gap-10 items-center ">Saved Name : <input placeholder="Enter model name here" value={config.name} onChange={(e) => {
                        setConfig({ ...config, name: e.target.value })
                    }} className=" outline-none p-2 w-4/6 text-md" />
                    </div>
                    <div className="flex gap-2 items-center" >
                        Quantization Bits :
                        <input placeholder="0 means no quantization"
                            className=" outline-none p-2 text-md w-56 "
                            value={config.quantization}
                            type="number"
                            onChange={(e) => {
                                setConfig({ ...config, quantization: Number(e.target.value) })
                            }} />

                    </div>

                    <div className="flex gap-[3.4rem] items-center" >

                        Target Dir: <input placeholder="dir path of the model" value={config.target_dir} onChange={(e) => {
                            setConfig({ ...config, target_dir: e.target.value })
                        }} className=" outline-none p-2 text-lg ml-2.5 " />



                    </div>
                    <div className="flex gap-2 mt-2">
                        <button className="p-1 hover:bg-black w-full hover:text-white rounded-md   my-2 text-black bg-white border border-black" onClick={() => { setNewView("hf") }}>Previous</button>
                        <button className="p-1 bg-black text-white w-full rounded-md my-2  hover:text-black hover:bg-white border border-black" onClick={() => { setNewView("install") }}>Next</button>
                    </div>
                </div>
            )
        case "install":

            return (
                <>
                    <InstallView setModelName={setModelName} setConfig={setConfig} config={config} value={install} stopRef={stopRef} setNewView={setNewView} />
                </>
            )
    }
}








export default function Installtion() {

    const [list, setList] = useState<string[]>([])
    const [open, setOpen] = useState(false)
    const [limit, setLimit] = useState(10)
    const [modelName, setModelName] = useState("")
    const [newView, setNewView] = useState<"hf" | "llm" | "install">("hf")
    const debouncedValue = useDebounce(modelName, 500);
    const [config, setConfig] = useState<ConfigInst>({
        name: "",
        hf_name: "",
        quantization: 0,
        target_dir: ""
    })
    const stopRef = useRef(false)
    const [install, setInstall] = useState("")

    const getItem = async () => {
        setLimit((e) => e + 10)
        setModelName("")
        setList((e) => [...e, , "loading ..."])
        const data = await fetch("https://huggingface.co/api/models?" + new URLSearchParams({
            limit: "" + limit,
            author: "mlx-community",
            full: "False",
            config: "False"
        }), { cache: "force-cache", headers: { authorization: "Bearer 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" } })
        const res = await data.json()
        setList(res.map((item: any) => item.modelId.split("/")[1]))
    }


    useEffect(() => {
        if (!!debouncedValue) {
            (async () => {
                try {
                    const data = await fetch("https://huggingface.co/api/models?" + new URLSearchParams({ limit: "10", author: "mlx-community", full: "False", config: "False", search: debouncedValue }), { cache: "force-cache", headers: { authorization: "Bearer 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" } })
                    const res = await data.json()
                    setList(res.map((item: any) => item.modelId.split("/")[1]))
                } catch (e) {
                    console.error(e)
                }
            })()
        } else {

            getItem()
        }
    }, [debouncedValue])

    useEffect(() => {
        if (newView === "llm") {
            const { path } = JSON.parse(localStorage.getItem("defualt"))
            setConfig({ name: modelName, hf_name: modelName, quantization: 0, target_dir: path })
            return
        }

        (async () => {
            if (newView === "install") {
                await installSend(stopRef, config, setInstall)


            }
        })()
    }, [newView])




    function Header() {

        return (
            <>
                <div className="flex items-start justify-between p-2 ">
                    <h1 className="text-lg font-semibold">{
                        newView === "install" ?
                            "Installing" : newView === "hf" ?
                                "Searching huggingface" : "Installastion options"
                    }</h1>
                    <AlertDialogTrigger>
                        <X className="w-5.5 rounded   hover:bg-gray-100" />
                    </AlertDialogTrigger>

                </div>

                <hr className="px-2" />
            </>
        )

    }

    useEffect(() => {
        if (open) {
            setModelName("")
        }
    }, [open])


    return (

        <AlertDialog open={open} onOpenChange={setOpen}>
            <AlertDialogTrigger >

                <button className='p-2 rounded-md hover:bg-gray-100 m-1'>Look in Huggingface 🤗</button>

            </AlertDialogTrigger>
            <AlertDialogContent className="focus:outline-none">
                <>
                    <Header />
                    <div className="overflow-y-scroll h-54">
                        <Content
                            newView={newView} setNewView={setNewView} config={config} list={list}
                            setConfig={setConfig} getItem={getItem} modelName={modelName}
                            setModelName={setModelName} install={install}
                            stopRef={stopRef} setModelName={setModelName}
                        />
                    </div>
                </>
            </AlertDialogContent>
        </AlertDialog>
    )
}
