import { beforeEach, describe, expect, it, vi } from "vitest"
import { act, renderHook, waitFor } from "@testing-library/react"
import type { ReactNode } from "react"
import { AlertContext } from "@/alert-context"
import { saveDefaultConfig, DEFAULT_GENERATION } from "@/lib/config"
import { useChat } from "./useChat"

const streamChat = vi.fn()
vi.mock("@/api", () => ({ streamChat: (...args: unknown[]) => streamChat(...args) }))

/** A stream whose chunks the test pushes manually; aborting the signal errors it like fetch would. */
function controllableStream(signal: AbortSignal) {
    let ctrl!: ReadableStreamDefaultController<string>
    const stream = new ReadableStream<string>({ start: (c) => { ctrl = c } })
    signal.addEventListener("abort", () => ctrl.error(new DOMException("Aborted", "AbortError")))
    return { reader: stream.getReader(), push: (s: string) => ctrl.enqueue(s), close: () => ctrl.close() }
}

let alert: ReturnType<typeof vi.fn>
function setup(model = "m1") {
    alert = vi.fn()
    const wrapper = ({ children }: { children: ReactNode }) => <AlertContext.Provider value={alert}>{children}</AlertContext.Provider>
    return renderHook(() => useChat(model), { wrapper })
}

let stream: ReturnType<typeof controllableStream>
beforeEach(() => {
    streamChat.mockReset()
    streamChat.mockImplementation(async (_body: unknown, signal: AbortSignal) => {
        stream = controllableStream(signal)
        return stream.reader
    })
    saveDefaultConfig({ ...DEFAULT_GENERATION, path: "./models/" })
})

const last = (r: ReturnType<typeof setup>["result"]) => r.current.conv[r.current.conv.length - 1]

describe("useChat", () => {
    it("streams chunks into the assistant message", async () => {
        const { result } = setup()
        let sent!: Promise<boolean>
        act(() => { sent = result.current.send("hi", ["pid1"]) })
        await waitFor(() => expect(streamChat).toHaveBeenCalled())
        expect(result.current.isStreaming).toBe(true)
        expect(result.current.pendingId).toBe(last(result).id)
        const body = streamChat.mock.calls[0][0]
        expect(body.model).toBe("./models/m1")
        expect(body.messages.pid).toEqual(["pid1"])
        expect(body.messages.messages[0].role).toBe("system")
        expect(body.messages.messages.at(-1)).toEqual({ role: "user", content: "hi" })

        act(() => stream.push("Hel"))
        await waitFor(() => expect(last(result).content).toBe("Hel"))
        expect(result.current.pendingId).toBeNull()
        act(() => { stream.push("lo"); stream.close() })
        await act(async () => { expect(await sent).toBe(true) })
        expect(last(result)).toMatchObject({ role: "assistant", content: "Hello" })
        expect(result.current.isStreaming).toBe(false)
    })

    it("ignores a second send while streaming", async () => {
        const { result } = setup()
        let first!: Promise<boolean>
        act(() => { first = result.current.send("one", []) })
        await waitFor(() => expect(streamChat).toHaveBeenCalledTimes(1))
        let second!: boolean
        await act(async () => { second = await result.current.send("two", []) })
        expect(second).toBe(false)
        expect(streamChat).toHaveBeenCalledTimes(1)
        act(() => stream.close())
        await act(async () => { await first })
    })

    it("stop keeps partial output", async () => {
        const { result } = setup()
        const before = result.current.conv.length
        let sent!: Promise<boolean>
        act(() => { sent = result.current.send("hi", []) })
        await waitFor(() => expect(streamChat).toHaveBeenCalled())
        act(() => stream.push("partial"))
        await waitFor(() => expect(last(result).content).toBe("partial"))
        await act(async () => { result.current.stop(); await sent })
        expect(result.current.conv).toHaveLength(before + 2)
        expect(last(result).content).toBe("partial")
        expect(result.current.isStreaming).toBe(false)
        expect(alert).not.toHaveBeenCalled()
    })

    it("stop before any output drops the empty reply", async () => {
        const { result } = setup()
        const before = result.current.conv.length
        let sent!: Promise<boolean>
        act(() => { sent = result.current.send("hi", []) })
        await waitFor(() => expect(streamChat).toHaveBeenCalled())
        await act(async () => { result.current.stop(); await sent })
        expect(result.current.conv).toHaveLength(before + 1)
        expect(last(result)).toMatchObject({ role: "user", content: "hi" })
    })

    it("on error removes both messages and alerts", async () => {
        vi.spyOn(console, "error").mockImplementation(() => { })
        streamChat.mockRejectedValueOnce(new Error("down"))
        const { result } = setup()
        const before = result.current.conv.length
        await act(async () => { await result.current.send("hi", []) })
        expect(result.current.conv).toHaveLength(before)
        expect(alert).toHaveBeenCalled()
    })

    it("refuses empty text, missing model, or missing config", async () => {
        const { result } = setup("")
        await act(async () => { expect(await result.current.send("   ", [])).toBe(false) })
        await act(async () => { expect(await result.current.send("hi", [])).toBe(false) })
        expect(alert).toHaveBeenCalledWith("Select a model before sending a message")
        localStorage.clear()
        await act(async () => { expect(await result.current.send("hi", [])).toBe(false) })
        expect(streamChat).not.toHaveBeenCalled()
    })
})
