let counter = 0

/** Client-generated unique id for list keys and message updates. */
export function newId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return crypto.randomUUID()
    }
    counter += 1
    return `${Date.now().toString(36)}-${counter}`
}
