'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { cn } from '@/lib/utils'

export function SearchBar({
  defaultValue = '',
  size = 'md',
  className,
}: {
  defaultValue?: string
  size?: 'md' | 'lg'
  className?: string
}) {
  const [q, setQ] = useState(defaultValue)
  const router = useRouter()

  return (
    <form
      className={cn('relative w-full', className)}
      onSubmit={(e) => {
        e.preventDefault()
        const params = new URLSearchParams()
        if (q.trim()) params.set('q', q.trim())
        router.push(`/search?${params.toString()}`)
      }}
      role="search"
    >
      <input
        type="search"
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search titles, abstracts, authors, keywords…"
        aria-label="Search papers"
        className={cn(
          'w-full rounded-full border border-ink-200 bg-white px-5 text-ink-900 shadow-[0_1px_2px_rgba(0,0,0,0.02)]',
          'placeholder:text-ink-400 focus:border-accent-400 focus:outline-none',
          size === 'lg' ? 'h-14 text-base pr-32' : 'h-11 text-sm pr-24',
        )}
      />
      <button
        type="submit"
        className={cn(
          'absolute right-1.5 top-1/2 -translate-y-1/2 rounded-full bg-ink-900 px-5 text-sm font-medium text-white hover:bg-ink-800',
          size === 'lg' ? 'h-11' : 'h-8',
        )}
      >
        Search
      </button>
    </form>
  )
}
