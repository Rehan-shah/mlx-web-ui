import { Import, MessageSquare, SquarePen, Trash } from 'lucide-react';
import { cn } from './lib/utils';
import React, { useEffect, useRef, useState } from 'react'
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
        <div className="group flex items-center gap-2 rounded-md px-2 py-1.5 text-muted hover:bg-hover hover:text-fg">
            <MessageSquare className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <button type="button" className="min-w-0 flex-1 truncate text-left text-[13px] focus:outline-none" onClick={onOpen}>{label}</button>
            <button
                type="button"
                aria-label={`Delete chat saved ${label}`}
                className="rounded p-0.5 opacity-0 hover:text-red-500 group-hover:opacity-100 focus:opacity-100"
                onClick={(e) => {
                    e.stopPropagation()
                    onDelete()
                }}
            >
                <Trash className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
        </div>
    );
}


export default function Sidebar({ conv, setConv, open = true }: { conv: ChatMessage[], setConv: SetConv, open?: boolean }) {
    const showAlert = useAlert()
    const asideRef = useRef<HTMLElement>(null)
    useEffect(() => {
        asideRef.current?.toggleAttribute("inert", !open)
    }, [open])
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
        <aside
            aria-hidden={!open}
            ref={asideRef}
            className={cn("h-screen shrink-0 overflow-hidden border-r border-line bg-panel transition-[width] duration-200", open ? "w-64" : "w-0 border-r-0")}
        >
          <div className="flex h-full w-64 flex-col px-3 pt-3">
            <div className="flex h-8 items-center gap-2 px-2 pb-1">
                <img src="mlx.png" alt="" className="h-5 w-5 rounded" />
                <span className="text-sm font-semibold tracking-tight">MLX Chat</span>
            </div>
            <button
                type='button'
                className='mt-3 flex w-full items-center gap-2 rounded-lg border border-line bg-bg px-3 py-2 text-sm font-medium shadow-sm hover:bg-hover'
                onClick={() => setConv((prev) => prev.slice(0, 1))}
            >
                <SquarePen className="h-4 w-4 text-muted" aria-hidden="true" />
                New chat
            </button>
            <div className="flex min-h-0 flex-1 flex-col pt-6">
                <h2 className="px-2 pb-1 text-left text-[11px] font-medium uppercase tracking-wider text-muted">Saved chats</h2>
                <div className='min-h-0 flex-1 overflow-y-auto'>
                    {Object.keys(savedConv).length === 0 && <p className="px-2 py-1 text-left text-[13px] text-muted">No saved chats yet</p>}
                    {Object.keys(savedConv).map((key) =>
                        <SavedChat key={key} savedAt={key} onOpen={() => openConv(key)} onDelete={() => deleteConv(key)} />)}
                </div>
            </div>
            <div className='border-t border-line py-2'>
                <Option text='Save' Svg={Import} onClick={saveCurrentConv} />
                <Settings />
            </div>
          </div>
        </aside>
    )
}
