import { forwardRef, type ButtonHTMLAttributes } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type OptionProps = ButtonHTMLAttributes<HTMLButtonElement> & { text: string, Svg: LucideIcon }

/** Sidebar action button. Forwards ref/props so it can be used with Radix `asChild` triggers. */
const Option = forwardRef<HTMLButtonElement, OptionProps>(({ text, Svg, className, ...props }, ref) => (
    <button ref={ref} type="button" {...props} className={cn("flex w-full justify-between rounded-md my-1 bg-[#f9f9f9]", className)}>
        <span className='flex gap-2 p-2 w-full px-2 hover:bg-gray-200 rounded-md'>
            <Svg className='w-[1.5rem] h-[1.5rem] opacity-70' aria-hidden="true" />
            <span className="text-base text-left px-2 opacity-70">{text}</span>
        </span>
    </button>
))
Option.displayName = "Option"

export default Option
