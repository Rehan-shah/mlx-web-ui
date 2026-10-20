import { describe, expect, it, vi } from "vitest"
import { act, fireEvent, render, renderHook, screen } from "@testing-library/react"
import { useTheme } from "@/lib/theme"
import { EmptyState } from "@/App"

function mockPrefersDark(dark: boolean) {
    vi.stubGlobal("matchMedia", (query: string) => ({ matches: dark && query.includes("dark"), media: query }))
}

describe("useTheme", () => {
    it("follows the system preference when nothing is stored", () => {
        mockPrefersDark(true)
        const { result } = renderHook(() => useTheme())
        expect(result.current.theme).toBe("dark")
        expect(document.documentElement.classList.contains("dark")).toBe(true)
    })

    it("prefers the stored theme over the system preference", () => {
        mockPrefersDark(true)
        localStorage.setItem("theme", "light")
        const { result } = renderHook(() => useTheme())
        expect(result.current.theme).toBe("light")
        expect(document.documentElement.classList.contains("dark")).toBe(false)
    })

    it("toggle switches the theme and persists it", () => {
        mockPrefersDark(false)
        const { result } = renderHook(() => useTheme())
        act(() => result.current.toggle())
        expect(result.current.theme).toBe("dark")
        expect(localStorage.getItem("theme")).toBe("dark")
        expect(document.documentElement.classList.contains("dark")).toBe(true)
    })
})

describe("EmptyState", () => {
    it("sends the clicked example prompt", () => {
        const onPick = vi.fn()
        render(<EmptyState onPick={onPick} disabled={false} />)
        expect(screen.getByText("How can I help today?")).toBeTruthy()
        const chip = screen.getAllByRole("button")[0]
        fireEvent.click(chip)
        expect(onPick).toHaveBeenCalledWith(chip.textContent)
    })

    it("disables the prompts while streaming", () => {
        render(<EmptyState onPick={() => { }} disabled />)
        for (const b of screen.getAllByRole("button")) expect((b as HTMLButtonElement).disabled).toBe(true)
    })
})
