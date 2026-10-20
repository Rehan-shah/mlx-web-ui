import { useEffect, useState } from 'react';
import * as AlertDialog from '@radix-ui/react-alert-dialog';
import { Settings as SettingsIcon, X } from 'lucide-react';
import { checkDir, fetchModels } from './api';
import { useAlert } from './alert-context';
import { Switch } from "@/components/ui/switch"
import Option from './components/Option';
import {
    DEFAULT_GENERATION,
    DEFAULT_MODEL_DIR,
    EMPTY_ROLE_MAPPING,
    loadDefaultConfig,
    loadModelConfig,
    normalizeModelDir,
    saveDefaultConfig,
    saveModelConfig,
} from './lib/config';
import { clearHfToken, loadHfToken, saveHfToken, useHfToken } from './lib/hfToken';
import { cn } from './lib/utils';
import { ROLE_MAPPING_KEYS, type GenerationConfig, type RoleMapping } from './types';

type Tab = "default" | "model"

/** Form values; numbers are kept as strings while editing. */
type FormState = {
    path: string,
    systemPrompt: string,
    temp: string,
    top_p: string,
    max_tokens: string,
    show_role_mapping: boolean,
    role_mapping: RoleMapping,
}

function toForm(config: GenerationConfig, path: string): FormState {
    return {
        path,
        systemPrompt: config.systemPrompt,
        temp: String(config.temp),
        top_p: String(config.top_p),
        max_tokens: String(config.max_tokens),
        show_role_mapping: config.show_role_mapping,
        role_mapping: { ...EMPTY_ROLE_MAPPING, ...config.role_mapping },
    }
}

const INITIAL_FORM = toForm(DEFAULT_GENERATION, DEFAULT_MODEL_DIR)

const focusRing = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400 focus-visible:ring-offset-1'
const fieldClass = cn('outline-none border-black border rounded px-2', focusRing)

function Divider() {
    return <div className='py-3'><hr /></div>
}

const Settings = () => {
    const [tab, setTab] = useState<Tab>("default")
    const [modelList, setModelList] = useState<string[]>([])
    const [model, setModel] = useState("")
    const [show, setShow] = useState(false)
    const [form, setForm] = useState<FormState>(INITIAL_FORM)
    const [saving, setSaving] = useState(false)
    const [hfToken, setHfToken] = useState("")
    const hasHfToken = useHfToken() !== null
    const showAlert = useAlert()
    const showDefault = tab === "default"

    const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
        setForm((prev) => ({ ...prev, [key]: value }))

    // Load the model list each time the dialog opens.
    useEffect(() => {
        if (!show) return
        const config = loadDefaultConfig()
        if (config === null) return
        const controller = new AbortController()
        fetchModels(config.path, controller.signal)
            .then((models) => {
                setModelList(models)
                setModel((current) => (models.includes(current) ? current : models[0] ?? ""))
            })
            .catch((error: unknown) => {
                if (controller.signal.aborted) return
                console.error(error)
                showAlert("Failed to load model, Check console for error")
            })
        return () => controller.abort()
    }, [show, showAlert])

    // Populate the form from storage whenever the dialog, tab or selected model changes.
    useEffect(() => {
        if (!show) return
        const defaults = loadDefaultConfig()
        const path = defaults?.path ?? DEFAULT_MODEL_DIR
        const base = defaults ?? DEFAULT_GENERATION
        const config = showDefault ? base : (model ? loadModelConfig(model) : null) ?? base
        setForm(toForm(config, path))
    }, [show, showDefault, model])

    useEffect(() => {
        if (show) setHfToken(loadHfToken() ?? "")
    }, [show])

    function parseNumbers(): Pick<GenerationConfig, "temp" | "top_p" | "max_tokens"> | null {
        const temp = Number(form.temp)
        const top_p = Number(form.top_p)
        const max_tokens = Number(form.max_tokens)
        if (form.temp.trim() === "" || form.top_p.trim() === "" || form.max_tokens.trim() === ""
            || !Number.isFinite(temp) || !Number.isFinite(top_p) || !Number.isInteger(max_tokens) || max_tokens <= 0) {
            return null
        }
        return { temp, top_p, max_tokens }
    }

    async function handleSave() {
        const numbers = parseNumbers()
        if (numbers === null) {
            showAlert("Temperature, Top P and Max token must be valid numbers")
            return
        }

        if (!showDefault) {
            if (model === "") {
                showAlert("No model selected, failed to save")
                return
            }
            saveModelConfig(model, {
                systemPrompt: form.systemPrompt,
                ...numbers,
                show_role_mapping: form.show_role_mapping,
                role_mapping: form.show_role_mapping ? form.role_mapping : undefined,
            })
            setShow(false)
            return
        }

        const path = normalizeModelDir(form.path)
        setSaving(true)
        try {
            if (!(await checkDir(path))) {
                showAlert("Path does not exist, failed to save")
                return
            }
            const existing = loadDefaultConfig()
            saveHfToken(hfToken)
            saveDefaultConfig({
                ...existing,
                path,
                systemPrompt: form.systemPrompt,
                ...numbers,
                // The default tab does not edit role mapping; keep what was stored.
                show_role_mapping: existing?.show_role_mapping ?? false,
                role_mapping: existing?.role_mapping,
            })
            setShow(false)
        } catch (error) {
            console.error(error)
            showAlert("Unable to reach the backend, check console for details")
        } finally {
            setSaving(false)
        }
    }

    return (<AlertDialog.Root onOpenChange={setShow} open={show}>
        <AlertDialog.Trigger asChild>
            <Option text="Settings" Svg={SettingsIcon} />
        </AlertDialog.Trigger>
        <AlertDialog.Portal>
            <AlertDialog.Overlay className="data-[state=open]:animate-overlayShow bg-black opacity-50 fixed inset-0" />
            <AlertDialog.Content
                aria-describedby={undefined}
                className="data-[state=open]:animate-contentShow fixed top-[50%] left-[50%] max-h-[85vh] overflow-y-auto w-[48vw] translate-x-[-50%] translate-y-[-50%] rounded-[6px] bg-white p-2 focus:outline-none"
            >
                <div className='flex p-4 justify-between'>
                    <AlertDialog.Title className='text-xl font-bold opacity-70'>Settings</AlertDialog.Title>
                    <AlertDialog.Cancel asChild>
                        <button type="button" aria-label="Close settings" className={cn('rounded-md p-1 hover:bg-gray-100', focusRing)}><X aria-hidden="true" /></button>
                    </AlertDialog.Cancel>
                </div>
                <hr className="h-px my-2 bg-gray-200 border-0 dark:bg-gray-700" />
                <div className='grid grid-cols-4 p-2 opacity-70'>
                    <div className='mr-5' role="tablist" aria-label="Settings scope">
                        <button type="button" role="tab" aria-selected={showDefault} onClick={() => setTab("default")}
                            className={cn('p-2 hover:bg-gray-100 rounded-md w-full font-semibold text-left', focusRing, showDefault && "bg-gray-100")}>Default</button>
                        <button type="button" role="tab" aria-selected={!showDefault} onClick={() => setTab("model")}
                            className={cn('p-2 mt-1 hover:bg-gray-100 rounded-md w-full font-semibold text-left', focusRing, !showDefault && "bg-gray-100")}>Model Specific</button>
                    </div>

                    <div className='col-span-3 pt-2' role="tabpanel">
                        <div className='flex justify-between'>
                            {!showDefault ? (
                                <>
                                    <label htmlFor="settings-model" className='bold'>Model Name</label>
                                    <select id="settings-model" onChange={(e) => setModel(e.target.value)} value={model} title={model}
                                        className={cn('outline-none px-2 max-w-[60%] truncate rounded', focusRing)}>
                                        {modelList.map((name) => <option key={name} value={name}>{name}</option>)}
                                    </select>
                                </>) : (
                                <>
                                    <label htmlFor="settings-path">Model directory</label>
                                    <input type="text" id="settings-path" value={form.path}
                                        onChange={(e) => setField("path", e.target.value)} className={fieldClass} />
                                </>
                            )}
                        </div>

                        <Divider />

                        <div className='flex justify-between'>
                            <label htmlFor="settings-systemPrompt" className='bold'>System Prompt</label>
                            <textarea id="settings-systemPrompt" value={form.systemPrompt}
                                onChange={(e) => setField("systemPrompt", e.target.value)} className={fieldClass} />
                        </div>

                        <Divider />

                        <div className='flex justify-between'>
                            <label htmlFor="settings-temp" className='bold'>Temperature</label>
                            <input type="number" step="any" id="settings-temp" value={form.temp}
                                onChange={(e) => setField("temp", e.target.value)} className={fieldClass} />
                        </div>

                        <Divider />

                        <div className='flex justify-between'>
                            <label htmlFor="settings-top_p" className='bold'>Top P</label>
                            <input type="number" step="any" id="settings-top_p" value={form.top_p}
                                onChange={(e) => setField("top_p", e.target.value)} className={fieldClass} />
                        </div>

                        <Divider />

                        <div className='flex justify-between'>
                            <label htmlFor="settings-max_tokens" className='bold'>Max token</label>
                            <input type="number" min={1} step={1} id="settings-max_tokens" value={form.max_tokens}
                                onChange={(e) => setField("max_tokens", e.target.value)} className={fieldClass} />
                        </div>

                        <Divider />
                        {showDefault &&
                            <>
                                <div className='flex justify-between gap-4'>
                                    <div>
                                        <label htmlFor="settings-hf-token">Hugging Face token</label>
                                        <p className='text-xs opacity-80'>Optional, needed for gated/private models, or if rate-limited. Stored only in this browser.</p>
                                    </div>
                                    <div className='flex shrink-0 items-start gap-2'>
                                        <input type="password" id="settings-hf-token" value={hfToken} placeholder="hf_..."
                                            autoComplete="off" spellCheck={false}
                                            onChange={(e) => setHfToken(e.target.value)} className={cn(fieldClass, 'w-44')} />
                                        <button type="button" disabled={!hasHfToken && hfToken === ""}
                                            onClick={() => { clearHfToken(); setHfToken("") }}
                                            className={cn('rounded border border-black px-2 text-sm hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed', focusRing)}>
                                            Remove
                                        </button>
                                    </div>
                                </div>
                                <Divider />
                            </>}
                        {!showDefault &&
                            <>
                                <div className='flex justify-between py-2'>
                                    <label htmlFor="settings-role-mapping-toggle" className='bold'>Enable custom Role mapping</label>
                                    <Switch
                                        id="settings-role-mapping-toggle"
                                        checked={form.show_role_mapping}
                                        onCheckedChange={(checked) => setField("show_role_mapping", checked)}
                                    />
                                </div>
                                {form.show_role_mapping && <>
                                    <hr />
                                    <fieldset className='flex justify-between w-full py-2'>
                                        <legend className='sr-only'>Role mapping</legend>
                                        <span aria-hidden="true">Role Mapping</span>
                                        <div className='w-50'>
                                            {ROLE_MAPPING_KEYS.map((role) => (
                                                <div className='grid grid-cols-3 w-50 mb-2' key={role}>
                                                    <label htmlFor={`settings-role-${role}`} className='left mr-2'>{role.toUpperCase()}</label>
                                                    <input type="text" id={`settings-role-${role}`} value={form.role_mapping[role]}
                                                        onChange={(e) => setField("role_mapping", { ...form.role_mapping, [role]: e.target.value })}
                                                        className={cn('w-35 col-span-2 border border-black rounded px-1 focus:outline-none', focusRing)} />
                                                </div>
                                            ))}
                                        </div>
                                    </fieldset>
                                </>}
                            </>}

                        <button type="button" onClick={() => void handleSave()} disabled={saving}
                            className={cn('w-full bg-black text-white mt-6 h-10 border border-black hover:bg-white hover:text-black rounded-md disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-black disabled:hover:text-white', focusRing)}>{saving ? "Saving…" : "Save"}</button>
                    </div>
                </div>
            </AlertDialog.Content>
        </AlertDialog.Portal>
    </AlertDialog.Root>)
};

export default Settings;
