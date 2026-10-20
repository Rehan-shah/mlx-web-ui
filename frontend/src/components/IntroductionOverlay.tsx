import { useState } from "react"
import { checkDir } from "@/api"
import { useAlert } from "@/alert-context"
import { DEFAULT_GENERATION, DEFAULT_MODEL_DIR, normalizeModelDir, saveDefaultConfig } from "@/lib/config"

export default function IntroductionOverlay({ onDone }: { onDone: () => void }) {
    const showAlert = useAlert()
    const [path, setPath] = useState(DEFAULT_MODEL_DIR)
    const [checking, setChecking] = useState(false)

    async function submit() {
        const normalized = normalizeModelDir(path)
        setChecking(true)
        try {
            if (!(await checkDir(normalized))) {
                showAlert("Invalid path, please try again")
                return
            }
            saveDefaultConfig({ ...DEFAULT_GENERATION, path: normalized })
            onDone()
        } catch (error) {
            console.error(error)
            showAlert("Unable to reach the backend, check console for details")
        } finally {
            setChecking(false)
        }
    }

    return (
        <div className="fixed inset-0 flex items-center justify-center z-50" role="dialog" aria-modal="true" aria-labelledby="intro-title">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-none"></div>
            <form
                className="relative w-full max-w-md rounded-2xl border border-line bg-bg p-8 text-left text-fg shadow-xl"
                onSubmit={(e) => { e.preventDefault(); void submit() }}
            >
                <h1 id="intro-title" className="text-xl font-semibold tracking-tight">Welcome to MLX Chat</h1>
                <p className="py-1 text-sm text-muted">
                    Before starting, please enter your folder path where your models are saved/will be saved.
                    If you enter a relative path, make it relative to the backend folder in the mlx-web-ui folder.
                </p>
                <p className="py-1 text-sm text-muted">
                    ./models is the default dir, you can continue with that.
                </p>
                <div className="py-2"></div>
                <label htmlFor="intro-model-dir" className="sr-only">Model directory</label>
                <input
                    id="intro-model-dir"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="Enter your path"
                    className="mb-3 h-10 w-full rounded-lg border border-line bg-transparent px-3 text-sm focus:border-accent focus:outline-none"
                    type="text"
                />
                <button
                    type="submit"
                    disabled={checking}
                    className="w-full rounded-lg bg-fg py-2 text-sm font-medium text-bg hover:opacity-90 disabled:opacity-50"
                >
                    Submit
                </button>
            </form>
        </div>
    );
}
