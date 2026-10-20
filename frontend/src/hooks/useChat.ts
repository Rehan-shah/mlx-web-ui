import { useCallback, useEffect, useRef, useState } from "react"
import { streamChat, type ChatRequest } from "@/api"
import { useAlert } from "@/alert-context"
import { loadDefaultConfig, loadModelConfig } from "@/lib/config"
import { newId } from "@/lib/id"
import type { ApiMessage, ChatMessage } from "@/types"

const INITIAL_CONVERSATION: ChatMessage[] = [
    { id: newId(), role: "user", content: "Hello, how are you?" },
    { id: newId(), role: "assistant", content: "I am fine, thank you. How can I help you today?" },
]

function formatRate(chunks: number, startedAt: number | null, endedAt: number): string | null {
    if (startedAt === null || chunks === 0) return null
    const seconds = (endedAt - startedAt) / 1000
    if (seconds <= 0) return null
    return (chunks / seconds).toFixed(1)
}

export function useChat(model: string) {
    const showAlert = useAlert()
    const [conv, setConv] = useState<ChatMessage[]>(INITIAL_CONVERSATION)
    const [isStreaming, setIsStreaming] = useState(false)
    /** Id of the assistant message currently waiting for its first chunk. */
    const [pendingId, setPendingId] = useState<string | null>(null)
    const [tokenPerSec, setTokenPerSec] = useState("NA")
    const abortRef = useRef<AbortController | null>(null)
    const streamingRef = useRef(false)

    // Abort an in-flight request if the component unmounts.
    useEffect(() => () => abortRef.current?.abort(), [])

    const stop = useCallback(() => {
        abortRef.current?.abort()
    }, [])

    /** Sends `text` with the given file collection ids. Returns false if nothing was sent. */
    const send = useCallback(async (text: string, pids: string[]): Promise<boolean> => {
        if (streamingRef.current || text.trim() === "") return false

        const defaultConfig = loadDefaultConfig()
        if (defaultConfig === null) {
            showAlert("No model directory configured. Reload the page to set it up.")
            return false
        }
        if (model === "") {
            showAlert("Select a model before sending a message")
            return false
        }
        const config = loadModelConfig(model) ?? defaultConfig

        const userMessage: ChatMessage = { id: newId(), role: "user", content: text }
        const assistantId = newId()
        const history: ApiMessage[] = conv.map(({ role, content }) => ({ role, content }))
        const messages: ApiMessage[] = [...history, { role: "user", content: text }]
        if (config.systemPrompt !== "") {
            messages.unshift({ role: "system", content: config.systemPrompt })
        }

        const body: ChatRequest = {
            messages: { pid: pids, messages },
            model: defaultConfig.path + model,
            stream: true,
            max_tokens: config.max_tokens,
            temp: config.temp,
            top_p: config.top_p,
        }
        if (config.show_role_mapping && config.role_mapping) {
            body.role_mapping = config.role_mapping
        }

        const controller = new AbortController()
        abortRef.current = controller
        streamingRef.current = true
        setIsStreaming(true)
        setPendingId(assistantId)
        setConv((prev) => [...prev, userMessage, { id: assistantId, role: "assistant", content: "" }])

        const updateAssistant = (content: string) =>
            setConv((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content } : m)))

        let response = ""
        let chunks = 0
        let startedAt: number | null = null
        try {
            const reader = await streamChat(body, controller.signal)
            for (; ;) {
                const { value, done } = await reader.read()
                if (done) break
                if (!value) continue
                if (startedAt === null) {
                    startedAt = performance.now()
                    setPendingId(null)
                }
                chunks++
                response += value
                updateAssistant(response)
            }
        } catch (error) {
            if (controller.signal.aborted) {
                // User pressed stop: keep whatever was generated, drop an empty reply.
                if (response === "") {
                    setConv((prev) => prev.filter((m) => m.id !== assistantId))
                }
            } else {
                console.error("Error while fetching:", error)
                showAlert("Unable to send request, check console logs for more info")
                setConv((prev) => prev.filter((m) => m.id !== assistantId && m.id !== userMessage.id))
            }
        } finally {
            const rate = formatRate(chunks, startedAt, performance.now())
            if (rate !== null) setTokenPerSec(rate)
            if (abortRef.current === controller) abortRef.current = null
            streamingRef.current = false
            setIsStreaming(false)
            setPendingId(null)
        }
        return true
    }, [conv, model, showAlert])

    return { conv, setConv, isStreaming, pendingId, tokenPerSec, send, stop }
}
