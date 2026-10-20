import type { ApiMessage, RoleMapping } from "@/types"
import { loadHfToken } from "@/lib/hfToken"

/** Single source of truth for the backend base URL. Override with VITE_API_BASE. */
export const API_BASE: string = (import.meta.env.VITE_API_BASE || "http://127.0.0.1:8000").replace(/\/+$/, "")

const JSON_HEADERS = { "Content-Type": "application/json" }

/** Error thrown for non-2xx backend responses. */
export class ApiError extends Error {
    constructor(public readonly status: number, message: string) {
        super(message)
        this.name = "ApiError"
    }
}

async function ensureOk(response: Response): Promise<Response> {
    if (!response.ok) {
        const text = await response.text().catch(() => "")
        throw new ApiError(response.status, text || response.statusText)
    }
    return response
}

export async function fetchModels(path: string, signal?: AbortSignal): Promise<string[]> {
    const response = await ensureOk(await fetch(`${API_BASE}/models?${new URLSearchParams({ path })}`, { method: "GET", signal }))
    const data: unknown = await response.json()
    if (typeof data === "object" && data !== null && "models" in data && Array.isArray(data.models)) {
        return data.models.filter((m: unknown): m is string => typeof m === "string")
    }
    throw new Error("Unexpected /models response")
}

export async function checkDir(path: string): Promise<boolean> {
    const response = await ensureOk(await fetch(`${API_BASE}/check_dir?${new URLSearchParams({ path })}`, { method: "GET" }))
    return (await response.json()) === true
}

export type ChatRequest = {
    messages: { pid: string[], messages: ApiMessage[] },
    model: string,
    stream: boolean,
    max_tokens: number,
    temp: number,
    top_p: number,
    role_mapping?: RoleMapping,
}

/**
 * Starts a streaming chat completion and returns a reader over the decoded text chunks.
 * Throws ApiError if the backend responds with an error.
 */
export async function streamChat(body: ChatRequest, signal: AbortSignal): Promise<ReadableStreamDefaultReader<string>> {
    const response = await ensureOk(await fetch(`${API_BASE}/v1/chat/completions`, {
        method: "POST",
        signal,
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
    }))
    // The streaming endpoint answers with text/plain; a JSON body means an error object was returned.
    if ((response.headers.get("content-type") ?? "").includes("application/json")) {
        throw new ApiError(response.status, await response.text())
    }
    if (response.body === null) {
        throw new Error("Empty response body")
    }
    return response.body.pipeThrough(new TextDecoderStream()).getReader()
}

export type InstallRequest = {
    name: string,
    hf_path: string,
    quantization: number,
    model_path: string,
    /** Optional Hugging Face token for gated/private repos; omitted when unset. */
    hf_token?: string,
}

/** Starts a model install and returns a reader over the streamed status updates. */
export async function streamInstall(body: InstallRequest, signal: AbortSignal): Promise<ReadableStreamDefaultReader<string>> {
    const response = await ensureOk(await fetch(`${API_BASE}/add_models`, {
        method: "POST",
        signal,
        headers: JSON_HEADERS,
        body: JSON.stringify(body),
    }))
    if (response.body === null) {
        throw new Error("Empty response body")
    }
    return response.body.pipeThrough(new TextDecoderStream()).getReader()
}

/** Uploads a file to build a vector DB; resolves with the collection id. */
export async function createVdb(file: File): Promise<string> {
    const formData = new FormData()
    formData.append("file", file)
    const response = await ensureOk(await fetch(`${API_BASE}/create_vdb`, { method: "POST", body: formData }))
    const data: unknown = await response.json()
    if (typeof data === "object" && data !== null && "pid" in data && typeof data.pid === "string") {
        return data.pid
    }
    throw new Error("Unexpected /create_vdb response")
}

export async function deleteVdb(pid: string): Promise<void> {
    await ensureOk(await fetch(`${API_BASE}/delete_vdb?${new URLSearchParams({ pid })}`, {
        method: "POST",
        headers: JSON_HEADERS,
    }))
}

const HF_API = "https://huggingface.co/api/models"

/**
 * Lists mlx-community models on Hugging Face. Works without auth; when the user has
 * stored a token it is sent as a Bearer token (helps with rate limits / private repos).
 * Throws ApiError carrying the HTTP status on failure (e.g. 401/403/429).
 */
export async function searchHfModels(options: { limit: number, search?: string }, signal?: AbortSignal): Promise<string[]> {
    const params = new URLSearchParams({
        limit: String(options.limit),
        author: "mlx-community",
        full: "False",
        config: "False",
    })
    if (options.search) params.set("search", options.search)
    const token = loadHfToken()
    const response = await ensureOk(await fetch(`${HF_API}?${params}`, {
        cache: "force-cache",
        signal,
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    }))
    const data: unknown = await response.json()
    if (!Array.isArray(data)) throw new Error("Unexpected Hugging Face response")
    return data.flatMap((item: unknown): string[] => {
        if (typeof item !== "object" || item === null) return []
        const id = "modelId" in item && typeof item.modelId === "string" ? item.modelId
            : "id" in item && typeof item.id === "string" ? item.id : null
        if (id === null) return []
        return [id.split("/")[1] ?? id]
    })
}
