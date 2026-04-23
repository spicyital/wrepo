import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { PaperCard } from '@/components/PaperCard'
import { documentTypes } from '@/lib/validation/paper'

type Facet = 'department' | 'year' | 'author' | 'advisor' | 'type' | 'keyword'
const allowed = new Set<Facet>(['department', 'year', 'author', 'advisor', 'type', 'keyword'])
export const dynamic = 'force-dynamic'

export async function generateMetadata({
  params,
}: {
  params: { facet: string; value: string }
}): Promise<Metadata> {
  const label = prettyLabel(params.facet, decodeURIComponent(params.value))
  return { title: label ? `${label} - Browse` : 'Browse' }
}

export default async function BrowseFacetPage({
  params,
}: {
  params: { facet: string; value: string }
}) {
  const facet = params.facet as Facet
  if (!allowed.has(facet)) notFound()
  const value = decodeURIComponent(params.value)
  if (facet === 'type' && !documentTypes.includes(value as (typeof documentTypes)[number])) {
    notFound()
  }

  const papers = await queryByFacet(facet, value)
  const heading = prettyLabel(facet, value)

  return (
    <div className="mx-auto max-w-4xl px-6 py-16">
      <Link href="/browse" className="text-xs uppercase tracking-widest text-ink-500 no-underline hover:text-ink-800">
        Back to browse
      </Link>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">{heading}</h1>
      <p className="mt-2 text-sm text-ink-500">
        {papers.length} published {papers.length === 1 ? 'paper' : 'papers'}
      </p>

      <div className="mt-8">
        {papers.length === 0 ? (
          <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-8 text-center">
            <p className="text-sm font-medium text-ink-800">No published records are assigned to this facet.</p>
            <p className="mt-2 text-sm text-ink-500">
              Browse facets remain visible only when public records support them.
            </p>
          </div>
        ) : (
          papers.map((p) => (
            <PaperCard
              key={p.id}
              slug={p.slug}
              title={p.title}
              abstract={p.abstract}
              year={p.year}
              authors={p.authors.map((a) => ({ name: a.author.name }))}
              department={p.department}
              documentType={p.documentType}
            />
          ))
        )}
      </div>
    </div>
  )
}

function prettyLabel(facet: string, value: string): string {
  const label = titleize(value)
  switch (facet) {
    case 'department':
      return `Department / ${label}`
    case 'year':
      return `Year / ${value}`
    case 'author':
      return `Author / ${label}`
    case 'advisor':
      return `Advisor / ${label}`
    case 'type':
      return `Type / ${label}`
    case 'keyword':
      return `Keyword / ${label}`
    default:
      return label
  }
}

function titleize(value: string): string {
  return value
    .replaceAll('_', ' ')
    .replaceAll('-', ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

async function queryByFacet(facet: Facet, value: string) {
  const baseInclude = {
    department: true,
    authors: { include: { author: true }, orderBy: { position: 'asc' as const } },
  }
  const baseWhere = { status: 'published' as const, deletedAt: null }

  switch (facet) {
    case 'department':
      return db.paper.findMany({
        where: { ...baseWhere, department: { slug: value } },
        orderBy: { publishedAt: 'desc' },
        include: baseInclude,
      })
    case 'year': {
      const y = Number(value)
      if (!Number.isFinite(y)) return []
      return db.paper.findMany({
        where: { ...baseWhere, year: y },
        orderBy: { publishedAt: 'desc' },
        include: baseInclude,
      })
    }
    case 'author':
      return db.paper.findMany({
        where: { ...baseWhere, authors: { some: { author: { slug: value } } } },
        orderBy: { publishedAt: 'desc' },
        include: baseInclude,
      })
    case 'advisor':
      return db.paper.findMany({
        where: { ...baseWhere, advisors: { some: { advisor: { slug: value } } } },
        orderBy: { publishedAt: 'desc' },
        include: baseInclude,
      })
    case 'type':
      return db.paper.findMany({
        where: { ...baseWhere, documentType: value as any },
        orderBy: { publishedAt: 'desc' },
        include: baseInclude,
      })
    case 'keyword':
      return db.paper.findMany({
        where: { ...baseWhere, keywords: { some: { keyword: { slug: value } } } },
        orderBy: { publishedAt: 'desc' },
        include: baseInclude,
      })
  }
}
