import { describe, expect, it, vi } from "vitest"
import {
    DEFAULT_GENERATION, DEFAULT_MODEL_DIR, loadDefaultConfig, loadModelConfig, loadSavedConversations,
    normalizeModelDir, saveDefaultConfig, saveModelConfig, storeSavedConversations,
} from "./config"

describe("normalizeModelDir", () => {
    it("adds exactly one trailing slash", () => {
        expect(normalizeModelDir("./models")).toBe("./models/")
        expect(normalizeModelDir("./models/")).toBe("./models/")
        expect(normalizeModelDir("  ./m  ")).toBe("./m/")
    })
    it("falls back to the default for blank input", () => {
        expect(normalizeModelDir("   ")).toBe(DEFAULT_MODEL_DIR)
    })
})

describe("default config", () => {
    it("returns null when unset, invalid JSON, or missing path", () => {
        expect(loadDefaultConfig()).toBeNull()
        const err = vi.spyOn(console, "error").mockImplementation(() => { })
        localStorage.setItem("default", "{not json")
        expect(loadDefaultConfig()).toBeNull()
        expect(err).toHaveBeenCalled()
        localStorage.setItem("default", "null")
        expect(loadDefaultConfig()).toBeNull()
        localStorage.setItem("default", JSON.stringify({ temp: 1 }))
        expect(loadDefaultConfig()).toBeNull()
    })
    it("round-trips and normalizes the path", () => {
        saveDefaultConfig({ ...DEFAULT_GENERATION, path: "./models", temp: 0.1 })
        expect(JSON.parse(localStorage.getItem("default")!).path).toBe("./models/")
        expect(loadDefaultConfig()).toEqual({ ...DEFAULT_GENERATION, path: "./models/", temp: 0.1 })
    })
    it("fills in defaults for bad field types", () => {
        localStorage.setItem("default", JSON.stringify({ path: "x", temp: "hot", max_tokens: null, role_mapping: { bos: "<s>", eot: 5 } }))
        const cfg = loadDefaultConfig()!
        expect(cfg.temp).toBe(DEFAULT_GENERATION.temp)
        expect(cfg.max_tokens).toBe(DEFAULT_GENERATION.max_tokens)
        expect(cfg.role_mapping).toEqual({ bos: "<s>", eos: "", system: "", user: "", assistant: "", eot: "" })
    })
})

describe("model config", () => {
    it("returns null when unset and round-trips", () => {
        expect(loadModelConfig("m")).toBeNull()
        saveModelConfig("m", { ...DEFAULT_GENERATION, top_p: 0.5 })
        expect(loadModelConfig("m")?.top_p).toBe(0.5)
        expect(loadModelConfig("other")).toBeNull()
    })
})

describe("saved conversations", () => {
    it("drops malformed messages and handles null", () => {
        expect(loadSavedConversations()).toEqual({})
        localStorage.setItem("convs", "null")
        expect(loadSavedConversations()).toEqual({})
        localStorage.setItem("convs", JSON.stringify({ "1": [{ role: "user", content: "hi" }, { role: "bad", content: "x" }, null], "2": "nope" }))
        const convs = loadSavedConversations()
        expect(convs["1"]).toHaveLength(1)
        expect(convs["1"][0]).toMatchObject({ role: "user", content: "hi" })
        expect(typeof convs["1"][0].id).toBe("string")
        expect(convs["2"]).toEqual([])
        storeSavedConversations({ a: [] })
        expect(loadSavedConversations()).toEqual({ a: [] })
    })
})
