import Link from 'next/link'
import { Badge } from './ui/Badge'
import { truncate } from '@/lib/utils'

export interface PaperCardProps {
  slug: string
  title: string
  abstract: string
  year: number
  authors?: { name: string }[]
  department?: { name: string; slug: string } | null
  documentType?: string | null
}

export function PaperCard(p: PaperCardProps) {
  return (
    <article className="group border-b border-ink-100 py-6 last:border-b-0">
      <div className="flex items-center gap-2 text-xs text-ink-500">
        {p.department && (
          <Link href={`/browse/department/${p.department.slug}`} className="no-underline hover:text-ink-800">
            {p.department.name}
          </Link>
        )}
        <span className="text-ink-300">/</span>
        <span>{p.year}</span>
        {p.documentType && (
          <>
            <span className="text-ink-300">/</span>
            <Badge tone="neutral" className="capitalize">
              {p.documentType.replaceAll('_', ' ')}
            </Badge>
          </>
        )}
      </div>
      <h3 className="mt-2 font-serif text-xl text-ink-900 group-hover:text-accent-700">
        <Link href={`/papers/${p.slug}`} className="no-underline">
          {p.title}
        </Link>
      </h3>
      {p.authors && p.authors.length > 0 && (
        <p className="mt-1 text-sm text-ink-600">{p.authors.map((a) => a.name).join(', ')}</p>
      )}
      <p className="mt-3 max-w-prose text-sm leading-relaxed text-ink-700">{truncate(p.abstract, 260)}</p>
    </article>
  )
}
