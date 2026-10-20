import { useSyncExternalStore } from "react"

/**
 * Optional, user-provided Hugging Face access token. Kept only in this browser's
 * localStorage; it is never hardcoded or logged.
 */
const TOKEN_KEY = "hf_token"
const PROMPT_DISMISSED_KEY = "hf_token_prompt_dismissed"
const CHANGE_EVENT = "hf-token-change"

function notify() {
    window.dispatchEvent(new Event(CHANGE_EVENT))
}

/** Returns the stored token, or null if none is set. */
export function loadHfToken(): string | null {
    const token = localStorage.getItem(TOKEN_KEY)?.trim()
    return token ? token : null
}

/** Stores the token; an empty value removes it. */
export function saveHfToken(token: string): void {
    const trimmed = token.trim()
    if (trimmed === "") localStorage.removeItem(TOKEN_KEY)
    else localStorage.setItem(TOKEN_KEY, trimmed)
    notify()
}

export function clearHfToken(): void {
    saveHfToken("")
}

export function isHfTokenPromptDismissed(): boolean {
    return localStorage.getItem(PROMPT_DISMISSED_KEY) === "true"
}

export function dismissHfTokenPrompt(): void {
    localStorage.setItem(PROMPT_DISMISSED_KEY, "true")
    notify()
}

function subscribe(callback: () => void) {
    const onStorage = (event: StorageEvent) => {
        if (event.key === TOKEN_KEY || event.key === PROMPT_DISMISSED_KEY) callback()
    }
    window.addEventListener(CHANGE_EVENT, callback)
    window.addEventListener("storage", onStorage)
    return () => {
        window.removeEventListener(CHANGE_EVENT, callback)
        window.removeEventListener("storage", onStorage)
    }
}

/** Reactive view of the stored token (null when unset). */
export function useHfToken(): string | null {
    return useSyncExternalStore(subscribe, loadHfToken)
}

export function useHfTokenPromptDismissed(): boolean {
    return useSyncExternalStore(subscribe, isHfTokenPromptDismissed)
}

/** HTTP statuses for which a (different) token may help. */
export function isHfAuthStatus(status: number): boolean {
    return status === 401 || status === 403 || status === 429
}

/** Best-effort detection of auth / gated / rate-limit failures in a backend install error message. */
export function isHfAuthErrorMessage(message: string): boolean {
    return /\b(401|403|429)\b|unauthori[sz]ed|forbidden|gated|rate.?limit|too many requests|invalid (user )?token|authentication|access to model/i.test(message)
}
