import { afterEach } from "vitest"
import { cleanup } from "@testing-library/react"

// Newer Node versions ship their own (often unusable) global localStorage that
// shadows jsdom's; install a simple in-memory Storage so tests behave the same everywhere.
class MemoryStorage implements Storage {
    private data = new Map<string, string>()
    get length() { return this.data.size }
    clear() { this.data.clear() }
    getItem(key: string) { return this.data.has(key) ? this.data.get(key)! : null }
    key(index: number) { return [...this.data.keys()][index] ?? null }
    removeItem(key: string) { this.data.delete(key) }
    setItem(key: string, value: string) { this.data.set(key, String(value)) }
}
Object.defineProperty(globalThis, "localStorage", { value: new MemoryStorage(), configurable: true })
Object.defineProperty(window, "localStorage", { value: globalThis.localStorage, configurable: true })

afterEach(() => {
    cleanup()
    localStorage.clear()
})

// cmdk / radix rely on these browser APIs that jsdom lacks.
globalThis.ResizeObserver ??= class {
    observe() { }
    unobserve() { }
    disconnect() { }
}
Element.prototype.scrollIntoView ??= function () { }
