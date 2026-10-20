import { describe, expect, it, vi } from "vitest"
import { act, renderHook } from "@testing-library/react"
import {
    clearHfToken, dismissHfTokenPrompt, isHfAuthErrorMessage, isHfAuthStatus, isHfTokenPromptDismissed,
    loadHfToken, saveHfToken, useHfToken,
} from "./hfToken"

describe("hfToken", () => {
    it("saves trimmed, treats blank as unset, clears", () => {
        expect(loadHfToken()).toBeNull()
        saveHfToken("  hf_abc  ")
        expect(loadHfToken()).toBe("hf_abc")
        saveHfToken("   ")
        expect(loadHfToken()).toBeNull()
        expect(localStorage.getItem("hf_token")).toBeNull()
        saveHfToken("hf_x")
        clearHfToken()
        expect(loadHfToken()).toBeNull()
        localStorage.setItem("hf_token", "  ")
        expect(loadHfToken()).toBeNull()
    })
    it("tracks prompt dismissal", () => {
        expect(isHfTokenPromptDismissed()).toBe(false)
        dismissHfTokenPrompt()
        expect(isHfTokenPromptDismissed()).toBe(true)
    })
    it("useHfToken reacts to changes", () => {
        const { result } = renderHook(() => useHfToken())
        expect(result.current).toBeNull()
        act(() => saveHfToken("hf_live"))
        expect(result.current).toBe("hf_live")
        act(() => clearHfToken())
        expect(result.current).toBeNull()
    })
    it("never logs the token", () => {
        const spies = (["log", "info", "warn", "error", "debug"] as const).map((k) => vi.spyOn(console, k))
        saveHfToken("hf_secret")
        loadHfToken()
        for (const s of spies) expect(s).not.toHaveBeenCalled()
    })
    it("classifies auth errors", () => {
        expect([401, 403, 429].every(isHfAuthStatus)).toBe(true)
        expect(isHfAuthStatus(500)).toBe(false)
        expect(isHfAuthErrorMessage("error: 401 Client Error")).toBe(true)
        expect(isHfAuthErrorMessage("Repo is gated")).toBe(true)
        expect(isHfAuthErrorMessage("disk full")).toBe(false)
    })
})
