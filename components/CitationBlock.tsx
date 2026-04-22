'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { doiUrl } from '@/lib/utils'

interface CitationInput {
  authors: { name: string }[]
  year: number
  title: string
  department?: string | null
  url: string
  doi?: string | null
}

function apa(c: CitationInput) {
  const authors = c.authors
    .map((a) => {
      const parts = a.name.trim().split(/\s+/)
      const last = parts.pop() ?? ''
      const initials = parts.map((p) => p[0] + '.').join(' ')
      return `${last}, ${initials}`.trim()
    })
    .join(', ')
  const dept = c.department ? `${c.department}, ` : ''
  return `${authors} (${c.year}). ${c.title}. ${dept}WRepo. ${doiUrl(c.doi) ?? c.url}`
}

function mla(c: CitationInput) {
  const authors = c.authors.map((a) => a.name).join(', ')
  return `${authors}. "${c.title}." WRepo, ${c.year}, ${doiUrl(c.doi) ?? c.url}.`
}

function bibtex(c: CitationInput) {
  const first = c.authors[0]?.name.split(/\s+/).pop()?.toLowerCase() ?? 'anon'
  const key = `${first}${c.year}`
  const authorList = c.authors.map((a) => a.name).join(' and ')
  const doiLine = c.doi ? `,\n  doi = {${c.doi}}` : ''
  return `@misc{${key},
  title = {${c.title}},
  author = {${authorList}},
  year = {${c.year}},
  howpublished = {\\url{${c.url}}},
  url = {${c.url}}${doiLine},
  note = {WRepo}
}`
}

export function CitationBlock(props: CitationInput) {
  const [tab, setTab] = useState<'apa' | 'mla' | 'bibtex'>('apa')
  const content = tab === 'apa' ? apa(props) : tab === 'mla' ? mla(props) : bibtex(props)
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(content)
      setCopied(true)
      setTimeout(() => setCopied(false), 1400)
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <div className="rounded-xl border border-ink-100 bg-ink-50/40">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2">
        <div className="flex gap-1">
          {(['apa', 'mla', 'bibtex'] as const).map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={cn(
                'rounded-md px-3 py-1 text-xs uppercase tracking-wider',
                tab === k ? 'bg-white text-ink-900 shadow-sm' : 'text-ink-500 hover:text-ink-800',
              )}
            >
              {k}
            </button>
          ))}
        </div>
        <button onClick={copy} className="text-xs text-accent-600 hover:text-accent-700">
          {copied ? 'Copied ✓' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto whitespace-pre-wrap break-words px-4 py-3 text-xs leading-relaxed text-ink-800">
        {content}
      </pre>
    </div>
  )
}
