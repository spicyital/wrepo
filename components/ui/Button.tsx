import * as React from 'react'
import { cn } from '@/lib/utils'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

const variantStyles: Record<Variant, string> = {
  primary: 'bg-ink-900 text-white hover:bg-ink-800',
  secondary: 'bg-white text-ink-900 border border-ink-200 hover:border-ink-300',
  ghost: 'bg-transparent text-ink-800 hover:bg-ink-50',
  danger: 'bg-red-600 text-white hover:bg-red-700',
}

const sizeStyles: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
}

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors',
        'disabled:opacity-50 disabled:pointer-events-none',
        variantStyles[variant],
        sizeStyles[size],
        className,
      )}
      {...props}
    />
  ),
)
Button.displayName = 'Button'
