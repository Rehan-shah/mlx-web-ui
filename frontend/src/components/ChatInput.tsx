import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { ArrowUp, Paperclip, Square } from 'lucide-react'
import { createVdb, deleteVdb } from '@/api'
import { useAlert } from '@/alert-context'
import { newId } from '@/lib/id'
import { cn } from '@/lib/utils'
import type { UploadedFile } from '@/types'
import FileShow from './file_show'

type ChatInputProps = {
    isStreaming: boolean,
    onSend: (text: string, pids: string[]) => Promise<boolean>,
    onStop: () => void,
}

const FILE_INPUT_ID = "chat-file-upload"

export default function ChatInput({ isStreaming, onSend, onStop }: ChatInputProps) {
    const showAlert = useAlert()
    const [input, setInput] = useState("")
    const [files, setFiles] = useState<UploadedFile[]>([])
    const [uploadsInFlight, setUploadsInFlight] = useState(0)

    const uploading = uploadsInFlight > 0
    const canSend = !isStreaming && !uploading && input.trim() !== ""

    async function send() {
        if (!canSend) return
        const text = input
        setInput("")
        const pids = files.flatMap((f) => (f.pid === null ? [] : [f.pid]))
        const sent = await onSend(text, pids)
        if (!sent) setInput(text)
    }

    function handleKeyDown(evt: KeyboardEvent<HTMLTextAreaElement>) {
        // Shift+Enter falls through to the default behaviour (newline).
        if (evt.key === "Enter" && !evt.shiftKey && !evt.nativeEvent.isComposing) {
            evt.preventDefault()
            void send()
        }
    }

    async function handleFileChange(e: ChangeEvent<HTMLInputElement>) {
        const fileInput = e.target
        const file = fileInput.files?.[0]
        // Reset so selecting the same file again still fires onChange.
        fileInput.value = ""
        if (!file) return

        const id = newId()
        setFiles((prev) => [...prev, { id, pid: null, filename: file.name, size: file.size, type: file.name.split(".").at(-1) ?? "" }])
        setUploadsInFlight((n) => n + 1)
        try {
            const pid = await createVdb(file)
            setFiles((prev) => prev.map((f) => (f.id === id ? { ...f, pid } : f)))
        } catch (error) {
            console.error("Error while uploading file:", error)
            showAlert("Unable to process file, check console logs for more info")
            setFiles((prev) => prev.filter((f) => f.id !== id))
        } finally {
            setUploadsInFlight((n) => n - 1)
        }
    }

    async function removeFile(file: UploadedFile) {
        setFiles((prev) => prev.filter((f) => f.id !== file.id))
        if (file.pid === null) return
        try {
            await deleteVdb(file.pid)
        } catch (error) {
            console.error("Error while deleting file:", error)
            showAlert("Failed to delete file, check console for further details")
        }
    }

    const active = isStreaming || canSend
    return (
        <div className='w-full rounded-2xl border border-line bg-bg p-2 shadow-[0_2px_12px_-4px_rgb(0_0_0/0.08)] transition-colors focus-within:border-fg/25'>
            {files.length > 0 && <div className='flex gap-2 overflow-x-auto p-1 pb-2'>
                {files.map((file) => <FileShow key={file.id} file={file} onRemove={removeFile} />)}
            </div>}
            <div className='flex items-end gap-1'>
                <label htmlFor={FILE_INPUT_ID} aria-label='Attach a file' title='Attach a file'
                    className='flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-fg'>
                    <Paperclip className='h-4 w-4' aria-hidden='true' />
                </label>
                <input onChange={handleFileChange} accept='.rtf,.pdf,.txt' name='file' className='hidden' type="file" id={FILE_INPUT_ID} />

                <TextareaAutosize
                    placeholder='Message…'
                    aria-label='Message'
                    className='max-h-72 w-full resize-none bg-transparent px-1 py-[7px] text-[15px] placeholder:text-muted focus:outline-none disabled:opacity-50'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <button
                    type='button'
                    aria-label={isStreaming ? 'Stop generating' : 'Send message'}
                    disabled={!active}
                    className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-colors',
                        active ? 'bg-fg text-bg hover:opacity-90' : 'bg-hover text-muted')}
                    onClick={isStreaming ? onStop : () => void send()}
                >
                    {isStreaming
                        ? <Square className='h-3.5 w-3.5 fill-current' aria-hidden='true' />
                        : <ArrowUp className='h-4 w-4' aria-hidden='true' />}
                </button>
            </div>
        </div>
    )
}
