import { AlertContext, URL, pidT } from "@/App";
import { CircleX } from "lucide-react"

import React, { useContext, useState } from "react"


const PDFsvg = () => <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36" fill="none" class="h-10 w-10 flex-shrink-0" width="36" height="36"><rect width="36" height="36" rx="6" fill="#FF5588"></rect><path d="M19.6663 9.66663H12.9997C12.5576 9.66663 12.1337 9.84222 11.8212 10.1548C11.5086 10.4673 11.333 10.8913 11.333 11.3333V24.6666C11.333 25.1087 11.5086 25.5326 11.8212 25.8451C12.1337 26.1577 12.5576 26.3333 12.9997 26.3333H22.9997C23.4417 26.3333 23.8656 26.1577 24.1782 25.8451C24.4907 25.5326 24.6663 25.1087 24.6663 24.6666V14.6666L19.6663 9.66663Z" stroke="white" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path><path d="M19.667 9.66663V14.6666H24.667" stroke="white" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21.3337 18.8334H14.667" stroke="white" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path><path d="M21.3337 22.1666H14.667" stroke="white" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path><path d="M16.3337 15.5H15.5003H14.667" stroke="white" stroke-width="1.66667" stroke-linecap="round" stroke-linejoin="round"></path></svg>

function formatSize(sizeInBytes: number) {
    const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    let size = sizeInBytes;
    let unitIndex = 0;

    while (size >= 1024 && unitIndex < units.length - 1) {
        size /= 1024;
        unitIndex++;
    }

    return `${size.toFixed(1)} ${units[unitIndex]}`;
}

function FileShow({ pid, setPid }: { pid: pidT, setPid: React.Dispatch<React.SetStateAction<pidT[]>> }) {

    const [_, setAlert] = useContext(AlertContext)


    let name = pid.filename
    const size = pid.size
    const type = pid.type
    if (pid.pid == null) {
        name = "Uploading " + name
    }

    if (name.length > 30) {
        name = name.substring(0, 28) + '...';
    }
    const handleChange = async () => {
        setPid((e) => e.filter((temp) => temp.pid !== pid.pid))
        const res = await fetch(URL + `/delete_vdb?pid=${pid.pid}`, {

            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },

        })
        if (!res.ok) {
            setAlert("failed to delete file check console for futher details")
            const err = await res.text()
            console.log(err)
        }
    }


    return (

        <div className="min-w-80 rounded-lg bg-gray-100 relative group h-full ">

            <div className="absolute  z-20 -top-1 left-1 w-full h-full flex justify-end items-start opacity-0 group-hover:opacity-100 ">
                <CircleX className="bg-white rounded-3xl " size={25} strokeWidth={1} onClick={handleChange} />
            </div>
            <div className="p-2 flex items-center">
                <div className="w-20">
                    <PDFsvg />
                </div>
                <div className="text-left -ml-6">
                    <h2 className="text-sm font-semibold">{name}</h2>
                    <p className="text-xs text-gray-500">{type.toUpperCase()} of {formatSize(size)}</p>
                </div>
            </div>
        </div>
    );
}


export default FileShow
