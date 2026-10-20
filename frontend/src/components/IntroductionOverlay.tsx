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
            <div className="absolute inset-0 bg-black opacity-50 pointer-events-none"></div>
            <form
                className="w-1/3 p-8 bg-white rounded-lg drop-shadow-md z-100 relative"
                onSubmit={(e) => { e.preventDefault(); void submit() }}
            >
                <h1 id="intro-title" className="text-2xl font-bold">Welcome to MLX web ui</h1>
                <p className="text-sm py-2">
                    Before starting, please enter your folder path where your models are saved/will be saved.
                    If you enter a relative path, make it relative to the backend folder in the mlx-web-ui folder.
                </p>
                <p className="text-sm py-2">
                    ./models is the default dir, you can continue with that.
                </p>
                <div className="py-4"></div>
                <label htmlFor="intro-model-dir" className="sr-only">Model directory</label>
                <input
                    id="intro-model-dir"
                    value={path}
                    onChange={(e) => setPath(e.target.value)}
                    placeholder="Enter your path"
                    className="w-72 h-12 rounded p-2 mb-4 z-100 relative pointer-events-auto focus:outline-none"
                    type="text"
                />
                <button
                    type="submit"
                    disabled={checking}
                    className="bg-black text-white rounded text-md p-1 z-100 relative pointer-events-auto disabled:opacity-50"
                >
                    Submit
                </button>
            </form>
        </div>
    );
}
