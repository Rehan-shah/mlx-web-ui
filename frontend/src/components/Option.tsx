import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type OptionProps = ButtonHTMLAttributes<HTMLButtonElement> & { text: string, Svg: LucideIcon }

/** Sidebar action button. Forwards ref/props so it can be used with Radix `asChild` triggers. */
const Option = forwardRef<HTMLButtonElement, OptionProps>(({ text, Svg, className, ...props }, ref) => (
    <button ref={ref} type="button" {...props}
        className={cn("flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-muted hover:bg-hover hover:text-fg", className)}>
        <Svg className='h-4 w-4' aria-hidden="true" />
        <span className="text-left">{text}</span>
    </button>
))
Option.displayName = "Option"

export default Option
