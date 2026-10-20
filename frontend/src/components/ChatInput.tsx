import { useState, type ChangeEvent, type KeyboardEvent } from 'react'
import TextareaAutosize from 'react-textarea-autosize'
import { CirclePause, Paperclip } from 'lucide-react'
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

    return (
        <div className='m-3 bg-white p-1 w-full px-2 mx-auto rounded-xl justify-center border border-gray-400 shadow-gray-200 shadow-sm items-end'>
            {files.length > 0 && <div className='p-1 pt-2 overflow-x-scroll flex gap-3'>
                {files.map((file) => <FileShow key={file.id} file={file} onRemove={removeFile} />)}
            </div>}
            <div className='flex'>
                <div>
                    <label htmlFor={FILE_INPUT_ID} aria-label='Attach a file' className='cursor-pointer w-[20px] h-[20px] m-[10px] flex flex-row justify-center items-center'>
                        <Paperclip aria-hidden='true' />
                    </label>
                    <input onChange={handleFileChange} accept='.rtf,.pdf,.txt' name='file' className='hidden' type="file" id={FILE_INPUT_ID} />
                </div>

                <TextareaAutosize
                    placeholder='Type here'
                    aria-label='Message'
                    className='w-full disabled:opacity-50 resize-none rounded-lg p-2 focus:outline-none max-h-96'
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                />

                <button
                    type='button'
                    aria-label={isStreaming ? 'Stop generating' : 'Send message'}
                    disabled={!isStreaming && !canSend}
                    className='disabled:opacity-50 w-[20px] h-[20px] m-[10px] flex flex-row justify-center items-center'
                    onClick={isStreaming ? onStop : () => void send()}
                >
                    <div className={cn('rounded-md p-[3px]', isStreaming || canSend ? "bg-black" : "bg-gray-100")}>
                        {isStreaming
                            ? <CirclePause className='text-white' width={24} height={24} aria-hidden='true' />
                            : <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="text-white" aria-hidden="true">
                                <path d="M7 11L12 6L17 11M12 18V7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path>
                            </svg>}
                    </div>
                </button>
            </div>
        </div>
    )
}
