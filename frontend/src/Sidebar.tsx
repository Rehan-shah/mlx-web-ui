import { Import, Trash } from 'lucide-react';
import React, { useState } from 'react'
import Option from './components/Option';
import { useAlert } from './alert-context';
import { loadSavedConversations, storeSavedConversations, type SavedConversations } from './lib/config';
import { newId } from './lib/id';
import type { ChatMessage } from './types';
import Settings from './Setting';

type SetConv = React.Dispatch<React.SetStateAction<ChatMessage[]>>

function SavedChat({ savedAt, onOpen, onDelete }: { savedAt: string, onOpen: () => void, onDelete: () => void }) {
    const label = new Date(Number(savedAt)).toLocaleString()
    return (
        <div className="group flex justify-between hover:bg-gray-100 flex-wrap py-1 my-1.5 px-2 rounded-md">
            <button type="button" className="text-sm hover:outline-none flex-1 text-left" onClick={onOpen}>{label}</button>
            <button
                type="button"
                aria-label={`Delete chat saved ${label}`}
                className="opacity-0 group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
            >
                <Trash className="w-[0.875rem]" aria-hidden="true" />
            </button>
        </div>
    );
}


export default function Sidebar({ conv, setConv }: { conv: ChatMessage[], setConv: SetConv }) {
    const showAlert = useAlert()
    const [savedConv, setSavedConv] = useState<SavedConversations>(loadSavedConversations)

    function update(next: SavedConversations) {
        storeSavedConversations(next)
        setSavedConv(next)
    }

    function saveCurrentConv() {
        update({ ...loadSavedConversations(), [Date.now()]: conv })
    }

    function deleteConv(key: string) {
        const next = { ...savedConv }
        delete next[key]
        update(next)
        showAlert("Deleted chat successfully")
    }

    function openConv(key: string) {
        // Fresh ids so messages never collide with ones already rendered.
        setConv(savedConv[key].map((m) => ({ ...m, id: newId() })))
    }

    return (
        <div className="bg-[#f9f9f9] pt-5 px-2 h-screen">
            <button
                type="button"
                className='flex justify-start focus:outline-none mx-auto w-full'
                onClick={() => setConv((prev) => prev.slice(0, 1))}
            >
                <span className='inline-flex flex-row p-2 px-3 justify-between w-full hover:bg-gray-200 rounded-md'>
                    <span className="text-sm font-bold opacity-70 text-left">New Chat</span>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="icon-md" aria-hidden="true"><path fillRule="evenodd" clipRule="evenodd" d="M16.7929 2.79289C18.0118 1.57394 19.9882 1.57394 21.2071 2.79289C22.4261 4.01184 22.4261 5.98815 21.2071 7.20711L12.7071 15.7071C12.5196 15.8946 12.2652 16 12 16H9C8.44772 16 8 15.5523 8 15V12C8 11.7348 8.10536 11.4804 8.29289 11.2929L16.7929 2.79289ZM19.7929 4.20711C19.355 3.7692 18.645 3.7692 18.2071 4.2071L10 12.4142V14H11.5858L19.7929 5.79289C20.2308 5.35499 20.2308 4.64501 19.7929 4.20711ZM6 5C5.44772 5 5 5.44771 5 6V18C5 18.5523 5.44772 19 6 19H18C18.5523 19 19 18.5523 19 18V14C19 13.4477 19.4477 13 20 13C20.5523 13 21 13.4477 21 14V18C21 19.6569 19.6569 21 18 21H6C4.34315 21 3 19.6569 3 18V6C3 4.34314 4.34315 3 6 3H10C10.5523 3 11 3.44771 11 4C11 4.55228 10.5523 5 10 5H6Z" fill="currentColor"></path></svg>
                </span>
            </button>
            <div className="px-1 pt-6">
                <h2 className="text-sm text-gray-400 text-left px-2">Saved chats</h2>
                <div className='overflow-y-scroll h-[calc(100vh-13.25rem)]'>
                    {Object.keys(savedConv).map((key) =>
                        <SavedChat key={key} savedAt={key} onOpen={() => openConv(key)} onDelete={() => deleteConv(key)} />)}
                </div>
            </div>
            <div className='pt-2'>
                <Option text='Save' Svg={Import} onClick={saveCurrentConv} />
                <Settings />
            </div>
        </div>
    )
}
