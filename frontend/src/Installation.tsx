import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog"
import { X, CircleX, CircleCheck, KeyRound, type LucideIcon } from "lucide-react"
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from "react"
import { ApiError, searchHfModels, streamInstall } from "./api"
import { DEFAULT_MODEL_DIR, loadDefaultConfig } from "./lib/config"
import {
    dismissHfTokenPrompt,
    isHfAuthErrorMessage,
    isHfAuthStatus,
    loadHfToken,
    saveHfToken,
    useHfToken,
    useHfTokenPromptDismissed,
} from "./lib/hfToken"
import { cn } from "./lib/utils"

type ConfigInst = {
    name: string,
    hf_name: string,
    quantization: number
    target_dir: string
}

type View = "hf" | "llm" | "install"

/**
 * Install status streamed by the backend. Note: "quantazation" is the literal
 * status string the backend emits, so it must be matched as-is.
 */
type InstallStatus = "" | "downloading" | "quantazation" | "done" | `error: ${string}`

const PAGE_SIZE = 10

const focusRing = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1"
const primaryButton = cn("p-2 bg-fg text-bg rounded-lg w-full text-sm font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed", focusRing)
const secondaryButton = cn("p-2 bg-transparent text-fg rounded-lg w-full text-sm border border-line hover:bg-hover disabled:opacity-50 disabled:cursor-not-allowed", focusRing)
const inputClass = cn("w-full rounded-md border border-gray-300 px-2 py-1.5 text-sm outline-none focus-visible:border-slate-500", focusRing)

function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        const handler = setTimeout(() => setDebouncedValue(value), delay);
        return () => clearTimeout(handler);
    }, [value, delay]);

    return debouncedValue;
}

function toStatus(value: string): InstallStatus | null {
    const trimmed = value.trim()
    if (trimmed === "downloading" || trimmed === "quantazation" || trimmed === "done") return trimmed
    if (trimmed.startsWith("error:")) return trimmed as `error: ${string}`
    return null
}

const isTerminal = (status: InstallStatus) => status === "done" || status.startsWith("error:")

async function runInstall(config: ConfigInst, setInstall: (status: InstallStatus) => void, signal: AbortSignal) {
    try {
        const token = loadHfToken()
        const reader = await streamInstall({
            name: config.name,
            hf_path: "mlx-community/" + config.hf_name,
            quantization: config.quantization,
            model_path: config.target_dir,
            ...(token ? { hf_token: token } : {}),
        }, signal)

        // Statuses are newline-terminated, but several may arrive in one chunk.
        let buffer = ""
        const flush = (text: string) => {
            const status = toStatus(text)
            if (status !== null) setInstall(status)
        }
        for (; ;) {
            const { value, done } = await reader.read()
            if (done) break
            buffer += value ?? ""
            const lines = buffer.split("\n")
            buffer = lines.pop() ?? ""
            lines.forEach(flush)
            // Older backends send bare tokens without a newline.
            const pending = buffer.trim()
            if (pending === "downloading" || pending === "quantazation" || pending === "done") {
                flush(pending)
                buffer = ""
            }
        }
        if (buffer.trim() !== "") flush(buffer)
    } catch (error) {
        if (signal.aborted) return
        console.error(error)
        setInstall(`error: ${error instanceof Error ? error.message : String(error)}`)
    }
}

function Spinner({ visible }: { visible: boolean }) {
    return (
        <div
            className={"inline-block mt-0.5 h-5 w-5 rounded-full border-[3px] border-solid border-current border-e-transparent align-[-0.125em] text-surface motion-reduce:animate-[spin_1.5s_linear_infinite] dark:text-white " + (visible ? "animate-spin" : "opacity-0")}
            role={visible ? "status" : undefined}
            aria-hidden={!visible}
        >
            {visible && <span className="sr-only">Loading...</span>}
        </div>
    )
}

function InstallItem({ title, caption, enable }: { title: string, caption: string, enable: boolean }) {
    return (
        <div className="flex gap-3 min-w-0">
            <div className="shrink-0"><Spinner visible={enable} /></div>
            <div className={cn("min-w-0", !enable && "opacity-70")}>
                <h3 className={cn("text-base break-words", enable && "font-semibold")}>{title}</h3>
                <p className="text-sm break-words">{enable ? `Currently ${caption}. For more details check the terminal.` : caption}</p>
            </div>
        </div>
    )
}

function InstallLogoItem({ Icon, text, color, caption }: { Icon: LucideIcon, text: string, color: string, caption: string }) {
    return (
        <div className="flex flex-col justify-center items-center text-center m-4">
            <Icon size={44} className={color} aria-hidden="true" />
            <h3 className="text-lg font-semibold p-2">{text}</h3>
            <p className="text-sm break-words max-w-full">{caption}</p>
        </div>
    )
}

type TokenPromptProps = {
    reason: "optional" | "auth",
    onDismiss?: () => void,
    onSaved?: () => void,
}

/** Small inline prompt for an optional Hugging Face token. */
function HfTokenPrompt({ reason, onDismiss, onSaved }: TokenPromptProps) {
    const [value, setValue] = useState("")
    const hasToken = useHfToken() !== null

    function save() {
        if (value.trim() === "") return
        saveHfToken(value)
        setValue("")
        onSaved?.()
    }

    return (
        <div className="relative rounded-md border border-gray-200 bg-gray-50 p-3 text-xs" role="region" aria-label="Hugging Face token">
            {onDismiss &&
                <button type="button" aria-label="Dismiss token prompt" onClick={onDismiss}
                    className={cn("absolute right-1.5 top-1.5 rounded p-0.5 opacity-60 hover:opacity-100 hover:bg-gray-200", focusRing)}>
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                </button>}
            <p className="flex items-center gap-1.5 pr-5 font-medium text-gray-700">
                <KeyRound className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                {reason === "auth"
                    ? (hasToken ? "Hugging Face rejected the request. Your token may be invalid or lack access." : "Hugging Face rejected the request. A token may help.")
                    : "Hugging Face token"}
            </p>
            <p className="mt-1 text-gray-500">Optional, needed for gated/private models, or if rate-limited. Stored only in this browser.</p>
            <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); save() }}>
                <label htmlFor={`hf-token-${reason}`} className="sr-only">Hugging Face token</label>
                <input id={`hf-token-${reason}`} type="password" autoComplete="off" spellCheck={false} placeholder="hf_..."
                    value={value} onChange={(e) => setValue(e.target.value)} className={cn(inputClass, "py-1 text-xs bg-white")} />
                <button type="submit" disabled={value.trim() === ""}
                    className={cn("shrink-0 rounded-md bg-fg px-3 py-1 text-xs text-bg hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed", focusRing)}>
                    {hasToken ? "Replace" : "Save"}
                </button>
                {hasToken &&
                    <button type="button" onClick={() => saveHfToken("")}
                        className={cn("shrink-0 rounded-md border border-gray-300 bg-white px-3 py-1 text-xs hover:bg-gray-100", focusRing)}>
                        Remove
                    </button>}
            </form>
        </div>
    )
}

function InstallView({ config, status, onRestart, onRetry }: { config: ConfigInst, status: InstallStatus, onRestart: () => void, onRetry: () => void }) {
    const error = status.startsWith("error:") ? status.slice("error:".length).trim() : null
    return (
        <div className="flex flex-col gap-4">
            <div className="flex rounded-md items-center bg-blue-500 text-white text-xs font-bold px-4 py-3" role="note">
                <svg className="fill-current w-4 h-4 mr-2 shrink-0" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" aria-hidden="true"><path d="M12.432 0c1.34 0 2.01.912 2.01 1.957 0 1.305-1.164 2.512-2.679 2.512-1.269 0-2.009-.75-1.974-1.99C9.789 1.436 10.67 0 12.432 0zM8.309 20c-1.058 0-1.833-.652-1.093-3.524l1.214-5.092c.211-.814.246-1.141 0-1.141-.317 0-1.689.562-2.502 1.117l-.528-.88c2.572-2.186 5.531-3.467 6.801-3.467 1.057 0 1.233 1.273.705 3.23l-1.391 5.352c-.246.945-.141 1.271.106 1.271.317 0 1.357-.392 2.379-1.207l.6.814C12.098 19.02 9.365 20 8.309 20z" /></svg>
                <p>You can press the cross icon to exit the view. It will NOT STOP the downloading process</p>
            </div>
            <div className="min-h-40 flex flex-col gap-4 opacity-80" aria-live="polite">
                {status === "" ?
                    <div className="text-sm text-gray-500 flex items-center gap-2"><Spinner visible /> Starting install…</div> :
                    status === "done" ? <InstallLogoItem Icon={CircleCheck} caption={`Added ${config.name} model to ${config.target_dir}`} color="text-green-500" text="Successfully Downloaded" /> :
                        error !== null ? <InstallLogoItem Icon={CircleX} caption={error} color="text-red-500" text="Error Occurred" /> :
                            <>
                                <InstallItem title={`Downloading ${config.name}`} caption={`downloading ${config.hf_name} repo from hf`} enable={status === "downloading"} />
                                {config.quantization > 0 &&
                                    <InstallItem title={`Quantization ${config.name}`} caption={`Applying ${config.quantization} bit Quantization`} enable={status === "quantazation"} />}
                            </>
                }
            </div>
            {error !== null && isHfAuthErrorMessage(error) && <HfTokenPrompt reason="auth" />}
            <div className="flex gap-2">
                {error !== null &&
                    <button type="button" onClick={onRetry} className={secondaryButton}>Retry</button>}
                <button type="button" onClick={onRestart}
                    className={cn("p-2 text-white text-sm bg-red-500 hover:bg-red-600 rounded-md w-full", focusRing)}>
                    {status === "done" ? "Install another model" : "Abort and restart"}
                </button>
            </div>
        </div>
    )
}

function Header({ view }: { view: View }) {
    const title = view === "install" ? "Installing" : view === "hf" ? "Searching Hugging Face" : "Installation options"
    return (
        <div className="flex items-center justify-between border-b border-gray-200 pb-3">
            <AlertDialogTitle className="text-lg font-semibold">{title}</AlertDialogTitle>
            <AlertDialogPrimitive.Cancel asChild>
                <button type="button" aria-label="Close" className={cn("rounded-md p-1 hover:bg-gray-100", focusRing)}>
                    <X className="h-5 w-5" aria-hidden="true" />
                </button>
            </AlertDialogPrimitive.Cancel>
        </div>
    )
}

type SearchViewProps = {
    list: string[],
    loading: boolean,
    error: ApiError | Error | null,
    query: string,
    setQuery: (query: string) => void,
    onPick: (hfName: string) => void,
    onLoadMore: () => void,
    onRetry: () => void,
}

function SearchView({ list, loading, error, query, setQuery, onPick, onLoadMore, onRetry }: SearchViewProps) {
    const hasToken = useHfToken() !== null
    const promptDismissed = useHfTokenPromptDismissed()
    const authError = error instanceof ApiError && isHfAuthStatus(error.status)

    return (
        <div className="flex flex-col gap-2">
            <label htmlFor="hf-search" className="sr-only">Search mlx-community models</label>
            <input id="hf-search" placeholder="Search mlx-community models…" value={query} onChange={(e) => setQuery(e.target.value)}
                className={inputClass} autoComplete="off" />
            {authError ? <HfTokenPrompt reason="auth" onSaved={onRetry} />
                : !hasToken && !promptDismissed && <HfTokenPrompt reason="optional" onDismiss={dismissHfTokenPrompt} onSaved={onRetry} />}
            {error !== null && !authError &&
                <p className="px-2 text-sm text-red-600">Could not reach Hugging Face. <button type="button" onClick={onRetry} className={cn("underline rounded", focusRing)}>Try again</button></p>}
            <ul className="flex flex-col">
                {list.map((item) => (
                    <li key={item}>
                        <button type="button" onClick={() => onPick(item)} title={item}
                            className={cn("w-full truncate text-left text-sm hover:bg-gray-100 px-2 py-1.5 rounded-md", focusRing)}>{item}</button>
                    </li>
                ))}
            </ul>
            {loading && <p className="px-2 text-sm text-gray-500">Searching Hugging Face…</p>}
            {!loading && error === null && list.length === 0 &&
                <p className="px-2 text-sm text-gray-500">{query ? `No mlx-community models match “${query}”.` : "No models found."}</p>}
            {!query && list.length > 0 &&
                <button type="button" disabled={loading} className={cn(primaryButton, "mt-2")} onClick={onLoadMore}>
                    View more (we recommend using the search bar instead)
                </button>}
        </div>
    )
}

type OptionsViewProps = {
    config: ConfigInst,
    setConfig: Dispatch<SetStateAction<ConfigInst>>,
    onBack: () => void,
    onNext: () => void,
}

function OptionsView({ config, setConfig, onBack, onNext }: OptionsViewProps) {
    return (
        <div className="flex flex-col gap-3 text-sm">
            <div className="grid grid-cols-[8.5rem_1fr] items-center gap-x-3 gap-y-3">
                <span>HF Name</span>
                <span className="truncate" title={`mlx-community/${config.hf_name}`}>mlx-community/{config.hf_name}</span>

                <label htmlFor="install-name">Saved Name</label>
                <input id="install-name" placeholder="Enter model name here" value={config.name}
                    onChange={(e) => setConfig((c) => ({ ...c, name: e.target.value }))} className={inputClass} />

                <label htmlFor="install-quantization">Quantization Bits</label>
                <input id="install-quantization" placeholder="0 means no quantization"
                    className={inputClass}
                    value={config.quantization}
                    type="number"
                    min={0}
                    onChange={(e) => setConfig((c) => ({ ...c, quantization: Number(e.target.value) || 0 }))} />

                <label htmlFor="install-target-dir">Target Dir</label>
                <input id="install-target-dir" placeholder="dir path of the model" value={config.target_dir}
                    onChange={(e) => setConfig((c) => ({ ...c, target_dir: e.target.value }))} className={inputClass} />
            </div>
            <div className="flex gap-2 mt-2">
                <button type="button" className={secondaryButton} onClick={onBack}>Previous</button>
                <button type="button" disabled={config.name.trim() === "" || config.target_dir.trim() === ""} className={primaryButton} onClick={onNext}>Next</button>
            </div>
        </div>
    )
}

type InstallationProps = {
    open: boolean,
    onOpenChange: (open: boolean) => void,
    /** Called once a model has been installed successfully. */
    onInstalled?: () => void,
    /** Lets the caller decide where focus goes when the dialog closes. */
    onCloseAutoFocus?: (event: Event) => void,
}

const EMPTY_CONFIG: ConfigInst = { name: "", hf_name: "", quantization: 0, target_dir: "" }

/**
 * Hugging Face install dialog. Controlled by the parent so it can live outside
 * transient UI (the model picker popover) and is never unmounted mid-install.
 */
export default function Installation({ open, onOpenChange, onInstalled, onCloseAutoFocus }: InstallationProps) {
    const [list, setList] = useState<string[]>([])
    const [listLoading, setListLoading] = useState(false)
    const [listError, setListError] = useState<Error | null>(null)
    const [limit, setLimit] = useState(PAGE_SIZE)
    const [modelName, setModelName] = useState("")
    const [view, setView] = useState<View>("hf")
    const debouncedValue = useDebounce(modelName, 500);
    const [config, setConfig] = useState<ConfigInst>(EMPTY_CONFIG)
    const [install, setInstall] = useState<InstallStatus>("")
    const [reloadKey, setReloadKey] = useState(0)
    const installAbortRef = useRef<AbortController | null>(null)
    const onInstalledRef = useRef(onInstalled)
    useEffect(() => { onInstalledRef.current = onInstalled }, [onInstalled])

    const loadList = useCallback(async (options: { limit: number, search?: string }, signal?: AbortSignal) => {
        setListLoading(true)
        setListError(null)
        try {
            setList(await searchHfModels(options, signal))
        } catch (error) {
            if (signal?.aborted) return
            console.error(error)
            setList([])
            setListError(error instanceof Error ? error : new Error(String(error)))
        } finally {
            if (!signal?.aborted) setListLoading(false)
        }
    }, [])

    // Only query Hugging Face while the search view is actually visible.
    const searching = open && view === "hf"
    useEffect(() => {
        if (!searching) return
        const controller = new AbortController()
        if (debouncedValue) {
            void loadList({ limit: PAGE_SIZE, search: debouncedValue }, controller.signal)
        } else {
            setLimit(PAGE_SIZE)
            void loadList({ limit: PAGE_SIZE }, controller.signal)
        }
        return () => controller.abort()
    }, [searching, debouncedValue, reloadKey, loadList])

    function loadMore() {
        const nextLimit = limit + PAGE_SIZE
        setLimit(nextLimit)
        void loadList({ limit: nextLimit })
    }

    function resetToSearch() {
        setView("hf")
        setModelName("")
        setConfig(EMPTY_CONFIG)
        setInstall("")
    }

    function handleOpenChange(next: boolean) {
        // Keep an in-progress install visible so the user can come back to it;
        // otherwise (idle, finished, failed) always start over at the search view.
        const installing = view === "install" && !isTerminal(install)
        if (!installing) resetToSearch()
        onOpenChange(next)
    }

    function pickModel(hfName: string) {
        const path = loadDefaultConfig()?.path ?? DEFAULT_MODEL_DIR
        setConfig({ name: hfName, hf_name: hfName, quantization: 0, target_dir: path })
        setView("llm")
    }

    function startInstall() {
        installAbortRef.current?.abort()
        const controller = new AbortController()
        installAbortRef.current = controller
        setInstall("")
        setView("install")
        void runInstall(config, (status) => {
            if (controller.signal.aborted) return
            setInstall(status)
            if (status === "done") onInstalledRef.current?.()
        }, controller.signal)
    }

    function abortAndRestart() {
        installAbortRef.current?.abort()
        installAbortRef.current = null
        resetToSearch()
    }

    return (
        <AlertDialog open={open} onOpenChange={handleOpenChange}>
            <AlertDialogContent className="flex max-h-[85vh] flex-col gap-4 focus:outline-none" aria-describedby={undefined} onCloseAutoFocus={onCloseAutoFocus}>
                <Header view={view} />
                <div className="min-h-0 flex-1 overflow-y-auto px-0.5 pb-0.5">
                    {view === "hf" &&
                        <SearchView list={list} loading={listLoading} error={listError} query={modelName} setQuery={setModelName}
                            onPick={pickModel} onLoadMore={loadMore} onRetry={() => setReloadKey((k) => k + 1)} />}
                    {view === "llm" &&
                        <OptionsView config={config} setConfig={setConfig} onBack={() => setView("hf")} onNext={startInstall} />}
                    {view === "install" &&
                        <InstallView config={config} status={install} onRestart={abortAndRestart} onRetry={startInstall} />}
                </div>
            </AlertDialogContent>
        </AlertDialog>
    )
}
