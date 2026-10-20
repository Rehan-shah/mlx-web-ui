import type { ChatMessage, DefaultConfig, GenerationConfig, ModelConfig, RoleMapping } from "@/types"
import { ROLE_MAPPING_KEYS } from "@/types"
import { newId } from "./id"

const DEFAULT_KEY = "default"
const modelKey = (model: string) => `config_${model}`

export const DEFAULT_MODEL_DIR = "./models/"

export const EMPTY_ROLE_MAPPING: RoleMapping = { bos: "", eos: "", system: "", user: "", assistant: "", eot: "" }

export const DEFAULT_GENERATION: GenerationConfig = {
    systemPrompt: "A chat between a curious user and an artificial intelligence assistant. The assistant follows the given rules no matter what.",
    temp: 0.7,
    top_p: 1,
    max_tokens: 256,
    show_role_mapping: false,
}

/**
 * Normalise a model directory so it always ends with exactly one "/".
 * The backend builds model paths as `path + modelName`, so this must be
 * consistent everywhere a path is saved.
 */
export function normalizeModelDir(path: string): string {
    const trimmed = path.trim()
    if (trimmed === "") return DEFAULT_MODEL_DIR
    return trimmed.endsWith("/") ? trimmed : trimmed + "/"
}

function readJson(key: string): unknown {
    const raw = localStorage.getItem(key)
    if (raw === null) return null
    try {
        return JSON.parse(raw)
    } catch (error) {
        console.error(`Invalid JSON in localStorage key "${key}"`, error)
        return null
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value)
}

function parseRoleMapping(value: unknown): RoleMapping | undefined {
    if (!isRecord(value)) return undefined
    const mapping = { ...EMPTY_ROLE_MAPPING }
    for (const key of ROLE_MAPPING_KEYS) {
        const v = value[key]
        if (typeof v === "string") mapping[key] = v
    }
    return mapping
}

function parseGeneration(value: Record<string, unknown>, fallback: GenerationConfig): GenerationConfig {
    const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d)
    return {
        systemPrompt: typeof value.systemPrompt === "string" ? value.systemPrompt : fallback.systemPrompt,
        temp: num(value.temp, fallback.temp),
        top_p: num(value.top_p, fallback.top_p),
        max_tokens: num(value.max_tokens, fallback.max_tokens),
        show_role_mapping: typeof value.show_role_mapping === "boolean" ? value.show_role_mapping : fallback.show_role_mapping,
        role_mapping: parseRoleMapping(value.role_mapping) ?? fallback.role_mapping,
    }
}

/** Returns the stored default config, or null if the user has not completed setup. */
export function loadDefaultConfig(): DefaultConfig | null {
    const value = readJson(DEFAULT_KEY)
    if (!isRecord(value) || typeof value.path !== "string") return null
    return { ...parseGeneration(value, DEFAULT_GENERATION), path: normalizeModelDir(value.path) }
}

export function saveDefaultConfig(config: DefaultConfig): void {
    localStorage.setItem(DEFAULT_KEY, JSON.stringify({ ...config, path: normalizeModelDir(config.path) }))
}

/** Returns the per-model config, or null if none has been saved. */
export function loadModelConfig(model: string): ModelConfig | null {
    const value = readJson(modelKey(model))
    if (!isRecord(value)) return null
    return parseGeneration(value, DEFAULT_GENERATION)
}

export function saveModelConfig(model: string, config: ModelConfig): void {
    localStorage.setItem(modelKey(model), JSON.stringify(config))
}

/** Saved conversations, keyed by the timestamp they were saved at. */
export type SavedConversations = Record<string, ChatMessage[]>

const CONVS_KEY = "convs"

function parseMessages(value: unknown): ChatMessage[] {
    if (!Array.isArray(value)) return []
    return value.flatMap((m): ChatMessage[] => {
        if (!isRecord(m) || typeof m.content !== "string") return []
        if (m.role !== "user" && m.role !== "assistant" && m.role !== "system") return []
        return [{ id: typeof m.id === "string" ? m.id : newId(), role: m.role, content: m.content }]
    })
}

export function loadSavedConversations(): SavedConversations {
    const value = readJson(CONVS_KEY)
    if (!isRecord(value)) return {}
    const result: SavedConversations = {}
    for (const [key, messages] of Object.entries(value)) {
        result[key] = parseMessages(messages)
    }
    return result
}

export function storeSavedConversations(convs: SavedConversations): void {
    localStorage.setItem(CONVS_KEY, JSON.stringify(convs))
}
