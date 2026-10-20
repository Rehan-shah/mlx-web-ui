import { createContext, useContext } from "react"

export type ShowAlert = (message: string) => void

export const AlertContext = createContext<ShowAlert>(() => { })

/** Returns a function that shows a toast message. */
export function useAlert(): ShowAlert {
    return useContext(AlertContext)
}
