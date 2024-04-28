import { Import, LucideIcon, Save, Settings, Trash } from 'lucide-react';
import React, { useState } from 'react'
import type { conv } from './App'


import Setting from './Setting';
interface JsonData {
    [key: number]: conv[]
}



function Element({ item, savedConv, setConvSaved, setConv }: {
    item: number, savedConv: JsonData, setConvSaved: React.Dispatch<React.SetStateAction<JsonData>>, setConv: React.Dispatch<React.SetStateAction<conv[]>>,
}) {
    const [show, setShow] = useState(false);


    const handleClick = () => {
        let instanceOfConv = { ...savedConv };
        console.log(instanceOfConv)
        const updatedConvData = { ...instanceOfConv };
        delete updatedConvData[item];
        localStorage.setItem('convs', JSON.stringify(updatedConvData));
        setConvSaved(updatedConvData);
    };
    return (
        <div
            className="flex justify-between hover:bg-gray-100  py-1 my-1.5 px-2 rounded-md"
            onMouseEnter={() => {
                setShow(true);
            }}
            onMouseLeave={() => {
                setShow(false);
            }}

            onClick={() => { setConv(savedConv[item]) }}

        >
            <button className="text-sm hover:outline-none"
            >{(new Date(item)).toGMTString().substring(0, 26)}</button>
            <Trash
                onClick={handleClick}
                className={"w-[0.875rem] " + (!show ? "opacity-0" : "opacity-100")}
            />
        </div>
    );
}
export function Option({ text, Svg, onClick }: { text: string, Svg: LucideIcon, onClick?: () => void }) {


    return (
        <div onClick={!onClick ? () => { } : onClick} className="flex justify-between  rounded-md my-1  bg-[#f9f9f9] ">
            <div role='button' className='flex gap-2 p-2 w-full px-2 hover:bg-gray-200 rounded-md'>
                <Svg className='w-[1.5rem] h-[1.5rem] opacity-70' />
                <p className="text-base text-left px-2  opacity-70">{text}</p>
            </div>
        </div>
    )
}


export default function Sidebar({ Conv, setConv }: { Conv: conv[], setConv: React.Dispatch<React.SetStateAction<conv[]>> }) {

    const [savedConv, setSavedConv] = useState<JsonData>(() => {

        const storedConvs = localStorage.getItem("convs");
        if (storedConvs) {
            try {
                return JSON.parse(storedConvs);
            } catch (error) {
                console.error("Error parsing stored convs:", error);
            }
        }
        return {};
    });

    function saveCurrentConv() {
        let savedConvs = JSON.parse(localStorage.getItem("convs"))
        if (!savedConvs) {
            savedConvs = {}
        }

        console.log("pre saved", savedConvs)
        savedConvs[Date.now()] = Conv
        console.log(savedConvs)
        localStorage.setItem("convs", JSON.stringify(savedConvs))
        setSavedConv(savedConvs)
    }

    return (
        <div className="bg-[#f9f9f9] pt-5 px-2 h-screen ">


            <button className='flex justify-start focus:outline-none mx-auto w-full' onClick={() => { setConv((preCov) => [preCov[0]]) }}>
                <div className='inline-flex  flex-row p-2 px-3 justify-between w-full hover:bg-gray-200 rounded-md '>
                    <h1 className="text-sm font-bold opacity-70 text-left">New Chat</h1>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md"><path fillRule="evenodd" clipRule="evenodd" d="M16.7929 2.79289C18.0118 1.57394 19.9882 1.57394 21.2071 2.79289C22.4261 4.01184 22.4261 5.98815 21.2071 7.20711L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.29289 11.2929L16.7929 2.79289ZM19.7929 4.20711C19.355 3.7692 18.645 3.7692 18.2071 4.2071L10 12.4142V14H11.5858L19.7929 5.79289C20.2308 5.35499 20.2308 4.64501 19.7929 4.20711ZM6 5C5.44772 5 5 5.44771 5 6V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V14C19 13.4477 19.4477 13 20 13C20.5523 13 21 13.4477 21 14V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34314 4.34315 3 6 3H10C10.5523 3 11 3.44771 11 4C11 4.55228 10.5523 5 10 5H6Z" fill="currentColor"></path></svg>
                </div>
            </button>
            <div className="px-1 pt-6">
                <p className="text-sm text-gray-400 text-left px-2">Saved chats</p>
                <div className='overflow-y-scroll h-[calc(100vh-13.25rem)]'>
                    {Object.keys(savedConv).map(
                        (item, i) => <Element key={i} item={Number(item)} savedConv={savedConv} setConvSaved={setSavedConv} setConv={setConv} />)}
                </div>

            </div>
            <div className='pt-2'>
                <Option text='Save' Svg={Import} onClick={saveCurrentConv} />
                <Setting />
            </div>
        </div>
    )

}


