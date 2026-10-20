import { useCallback, useEffect, useRef, useState } from 'react'
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command"
import { fetchModels } from '@/api'
import { useAlert } from '@/alert-context'
import { loadDefaultConfig } from '@/lib/config'
import Installation from '@/Installation'

type ModelSelectionProps = {
    model: string,
    setModel: (model: string) => void,
}

export default function ModelSelection({ model, setModel }: ModelSelectionProps) {
    const [show, setShow] = useState(false)
    const [installOpen, setInstallOpen] = useState(false)
    /** Bumped after a successful install so the list is refetched. */
    const [refreshKey, setRefreshKey] = useState(0)
    const showAlert = useAlert()
    /** null while loading. */
    const [models, setModels] = useState<string[] | null>(null)
    const toggleRef = useRef<HTMLButtonElement>(null)

    useEffect(() => {
        if (!show) return
        const config = loadDefaultConfig()
        if (config === null) {
            setModels([])
            return
        }
        const controller = new AbortController()
        setModels(null)
        fetchModels(config.path, controller.signal)
            .then(setModels)
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                console.error(error)
                setModels([])
                showAlert("Failed to fetch models, check console for details")
            })
        return () => controller.abort()
    }, [show, refreshKey, showAlert])

    const handleInstalled = useCallback(() => setRefreshKey((k) => k + 1), [])

    function openInstaller() {
        // Close the picker first; the dialog lives outside it so it is not
        // unmounted by cmdk filtering and its events do not bubble into cmdk.
        setShow(false)
        setInstallOpen(true)
    }

    const label = model ? model : "No Model Selected"

    return (
        <>
            <button
                ref={toggleRef}
                type='button'
                className='flex justify-start rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50'
                aria-expanded={show}
                aria-haspopup='listbox'
                onClick={() => setShow(!show)}
            >
                <div className='inline-flex flex-row px-2.5 py-1.5 items-center gap-1 hover:bg-hover rounded-lg min-w-0'>
                    <span className="text-sm font-medium text-left truncate max-w-[40vw]" title={label}>
                        {label}
                    </span>
                    <svg width="17" height="18" viewBox="0 0 16 17" fill="none" className="text-muted shrink-0" aria-hidden="true"><path d="M11.3346 7.83203L8.00131 11.1654L4.66797 7.83203" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"></path></svg>
                </div>
            </button>
            {show && (
                <Command className='absolute left-0 top-full z-20 mt-1 h-fit w-80 rounded-xl border border-line bg-bg text-sm text-fg shadow-lg'>
                    <CommandInput placeholder="Type the model name..." />
                    <CommandList>
                        {models === null
                            ? <p className='py-6 text-center text-sm text-gray-500' role='status'>Loading models…</p>
                            : <>
                                <CommandEmpty>
                                    {models.length === 0 ? "No models installed yet." : "No matching models."}
                                </CommandEmpty>
                                <CommandGroup heading="Installed" className='text-left'>
                                    {models.map((name) => <CommandItem key={name} value={name}
                                        onSelect={() => {
                                            setModel(name)
                                            setShow(false)
                                        }}>
                                        <span className='truncate' title={name}>{name}</span>
                                    </CommandItem>)}
                                </CommandGroup>
                            </>}
                    </CommandList>
                    <CommandSeparator />
                    <button type='button' onClick={openInstaller}
                        className='m-1 rounded-md p-2 text-sm text-muted hover:bg-hover hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400'>
                        Browse Hugging Face models
                    </button>
                </Command>
            )}
            <Installation
                open={installOpen}
                onOpenChange={setInstallOpen}
                onInstalled={handleInstalled}
                onCloseAutoFocus={(event) => {
                    // The original trigger lived in the (now closed) picker; return focus to the picker toggle.
                    event.preventDefault()
                    toggleRef.current?.focus()
                }}
            />
        </>
    )
}
