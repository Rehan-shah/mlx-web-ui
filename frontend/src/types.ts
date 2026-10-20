export type Role = "system" | "user" | "assistant"

/** A chat message as sent to the backend. */
export type ApiMessage = { role: Role, content: string }

/** A chat message as kept in the UI (has a stable client-side id for keys/updates). */
export type ChatMessage = ApiMessage & { id: string }

/** A file attached to the current chat. `pid` is null while the upload is in flight. */
export type UploadedFile = {
    id: string,
    pid: string | null,
    filename: string,
    size: number,
    type: string
}

export type RoleMapping = {
    bos: string,
    eos: string,
    system: string,
    user: string,
    assistant: string,
    eot: string,
}

export const ROLE_MAPPING_KEYS: (keyof RoleMapping)[] = ["bos", "eos", "system", "user", "assistant", "eot"]

/** Generation settings shared by the default config and per-model configs. */
export type GenerationConfig = {
    systemPrompt: string,
    temp: number,
    top_p: number,
    max_tokens: number,
    show_role_mapping: boolean,
    role_mapping?: RoleMapping,
}

/** Stored under localStorage "default". `path` always ends with "/". */
export type DefaultConfig = GenerationConfig & { path: string }

/** Stored under localStorage `config_${model}`. */
export type ModelConfig = GenerationConfig
