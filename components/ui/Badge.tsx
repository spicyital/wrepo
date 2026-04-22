import * as React from 'react'
import { cn } from '@/lib/utils'

type Tone = 'neutral' | 'accent' | 'success' | 'warn' | 'danger'

const tones: Record<Tone, string> = {
  neutral: 'bg-ink-100 text-ink-700',
  accent: 'bg-accent-100 text-accent-700',
  success: 'bg-emerald-100 text-emerald-700',
  warn: 'bg-amber-100 text-amber-800',
  danger: 'bg-red-100 text-red-700',
}

export function Badge({
  tone = 'neutral',
  className,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { tone?: Tone }) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        tones[tone],
        className,
      )}
      {...props}
    />
  )
}
