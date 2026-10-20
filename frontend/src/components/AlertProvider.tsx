import { useCallback, useEffect, useState, type ReactNode } from "react"
import { AlertContext } from "@/alert-context"
import AlertToast from "@/components/ui/toast"

const ALERT_DURATION_MS = 3000

export default function AlertProvider({ children }: { children: ReactNode }) {
    const [alert, setAlert] = useState("")
    const [open, setOpen] = useState(false)

    useEffect(() => {
        if (alert === "") return
        setOpen(true)
        const timer = setTimeout(() => {
            setOpen(false)
            setAlert("")
        }, ALERT_DURATION_MS)
        return () => clearTimeout(timer)
    }, [alert])

    const showAlert = useCallback((message: string) => setAlert(message), [])

    return (
        <AlertContext.Provider value={showAlert}>
            <AlertToast open={open} setOpen={setOpen} title={alert} />
            {children}
        </AlertContext.Provider>
    )
}
