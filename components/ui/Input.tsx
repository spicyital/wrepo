import * as React from 'react'
import { cn } from '@/lib/utils'

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900',
        'placeholder:text-ink-400 focus:border-accent-400 focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Input.displayName = 'Input'

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn(
        'w-full min-h-[8rem] rounded-md border border-ink-200 bg-white px-3 py-2 text-sm text-ink-900',
        'placeholder:text-ink-400 focus:border-accent-400 focus:outline-none',
        className,
      )}
      {...props}
    />
  ),
)
Textarea.displayName = 'Textarea'

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        'h-10 w-full rounded-md border border-ink-200 bg-white px-3 text-sm text-ink-900',
        'focus:border-accent-400 focus:outline-none',
        className,
      )}
      {...props}
    >
      {children}
    </select>
  ),
)
Select.displayName = 'Select'
