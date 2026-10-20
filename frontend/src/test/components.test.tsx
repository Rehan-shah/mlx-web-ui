import { describe, expect, it, vi } from "vitest"
import { fireEvent, render, screen } from "@testing-library/react"
import { AlertContext } from "@/alert-context"
import Sidebar from "@/Sidebar"
import ModelSelection from "@/components/ModelSelection"
import { storeSavedConversations } from "@/lib/config"

describe("Sidebar", () => {
    it("deleting a saved chat does not open it", () => {
        storeSavedConversations({ "1700000000000": [{ id: "a", role: "user", content: "saved" }] })
        const setConv = vi.fn()
        const alert = vi.fn()
        render(<AlertContext.Provider value={alert}><Sidebar conv={[]} setConv={setConv} /></AlertContext.Provider>)
        fireEvent.click(screen.getByRole("button", { name: /Delete chat saved/ }))
        expect(setConv).not.toHaveBeenCalled()
        expect(alert).toHaveBeenCalledWith("Deleted chat successfully")
        expect(screen.queryByRole("button", { name: /Delete chat saved/ })).toBeNull()
        expect(JSON.parse(localStorage.getItem("convs")!)).toEqual({})
    })

    it("clicking a saved chat opens it", () => {
        storeSavedConversations({ "1700000000000": [{ id: "a", role: "user", content: "saved" }] })
        const setConv = vi.fn()
        render(<Sidebar conv={[]} setConv={setConv} />)
        fireEvent.click(screen.getByRole("button", { name: new Date(1700000000000).toLocaleString() }))
        expect(setConv).toHaveBeenCalledWith([expect.objectContaining({ role: "user", content: "saved" })])
    })
})

describe("ModelSelection", () => {
    it("shows the empty state when no models are installed", async () => {
        const fetchSpy = vi.spyOn(globalThis, "fetch")
        render(<ModelSelection model="" setModel={() => { }} />)
        expect(screen.getByText("No Model Selected")).toBeTruthy()
        fireEvent.click(screen.getByRole("button", { name: /No Model Selected/ }))
        expect(await screen.findByText("No models installed yet.")).toBeTruthy()
        expect(fetchSpy).not.toHaveBeenCalled()
    })
})
