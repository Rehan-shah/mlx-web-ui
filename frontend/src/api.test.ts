import { describe, expect, it, vi } from "vitest"
import { API_BASE, ApiError, checkDir, deleteVdb, fetchModels, searchHfModels, streamChat, type ChatRequest } from "./api"
import { saveHfToken } from "./lib/hfToken"

function mockFetch(response: Response) {
    return vi.spyOn(globalThis, "fetch").mockResolvedValue(response)
}

const json = (data: unknown, init?: ResponseInit) =>
    new Response(JSON.stringify(data), { headers: { "content-type": "application/json" }, ...init })

describe("searchHfModels", () => {
    it("omits Authorization without a token", async () => {
        const f = mockFetch(json([{ modelId: "mlx-community/a" }, { id: "mlx-community/b" }, 3]))
        expect(await searchHfModels({ limit: 5 })).toEqual(["a", "b"])
        const init = f.mock.calls[0][1]!
        expect(init.headers).toBeUndefined()
    })
    it("sends a Bearer token when set", async () => {
        saveHfToken("hf_tok")
        const f = mockFetch(json([]))
        await searchHfModels({ limit: 5, search: "llama" })
        const [url, init] = f.mock.calls[0]
        expect(init!.headers).toEqual({ Authorization: "Bearer hf_tok" })
        expect(String(url)).toContain("search=llama")
    })
    it("throws ApiError with status on failure", async () => {
        mockFetch(new Response("slow down", { status: 429 }))
        await expect(searchHfModels({ limit: 1 })).rejects.toMatchObject({ name: "ApiError", status: 429, message: "slow down" })
    })
})

describe("backend calls", () => {
    it("never sends the HF token to the backend", async () => {
        saveHfToken("hf_tok")
        const f = mockFetch(json({ models: ["x"] }))
        await fetchModels("./models/")
        expect(JSON.stringify(f.mock.calls[0][1])).not.toContain("hf_tok")
    })
    it("fetchModels parses and errors on !ok", async () => {
        const f = mockFetch(json({ models: ["a", 1, "b"] }))
        expect(await fetchModels("./models/")).toEqual(["a", "b"])
        expect(String(f.mock.calls[0][0])).toBe(`${API_BASE}/models?path=.%2Fmodels%2F`)
        f.mockResolvedValue(json({ detail: "bad" }, { status: 400 }))
        await expect(fetchModels("../")).rejects.toBeInstanceOf(ApiError)
    })
    it("checkDir and deleteVdb", async () => {
        mockFetch(json(true))
        expect(await checkDir("./models")).toBe(true)
        mockFetch(new Response("nope", { status: 404 }))
        await expect(deleteVdb("p")).rejects.toMatchObject({ status: 404 })
    })
    it("streamChat returns a text reader, rejects JSON bodies and errors", async () => {
        const body = { messages: { pid: [], messages: [] }, model: "m", stream: true, max_tokens: 1, temp: 0, top_p: 1 } satisfies ChatRequest
        mockFetch(new Response("hello", { headers: { "content-type": "text/plain" } }))
        const reader = await streamChat(body, new AbortController().signal)
        let out = ""
        for (; ;) { const { value, done } = await reader.read(); if (done) break; out += value }
        expect(out).toBe("hello")
        mockFetch(json({ detail: "x" }))
        await expect(streamChat(body, new AbortController().signal)).rejects.toBeInstanceOf(ApiError)
        mockFetch(new Response("boom", { status: 500 }))
        await expect(streamChat(body, new AbortController().signal)).rejects.toMatchObject({ status: 500, message: "boom" })
    })
})
