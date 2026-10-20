import { useEffect, useState } from "react"

export type Theme = "light" | "dark"

function initialTheme(): Theme {
    const stored = localStorage.getItem("theme")
    if (stored === "light" || stored === "dark") return stored
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function useTheme() {
    const [theme, setTheme] = useState<Theme>(initialTheme)
    useEffect(() => {
        document.documentElement.classList.toggle("dark", theme === "dark")
    }, [theme])
    function toggle() {
        setTheme((t) => {
            const next = t === "dark" ? "light" : "dark"
            localStorage.setItem("theme", next)
            return next
        })
    }
    return { theme, toggle }
}
