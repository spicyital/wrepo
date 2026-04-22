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
  return { title: label ? `${label} — Browse` : 'Browse' }
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
        ← Browse
      </Link>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">{heading}</h1>
      <p className="mt-2 text-sm text-ink-500">
        {papers.length} published {papers.length === 1 ? 'paper' : 'papers'}
      </p>

      <div className="mt-8">
        {papers.length === 0 ? (
          <p className="py-12 text-center text-sm text-ink-500">No papers match this filter yet.</p>
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
  switch (facet) {
    case 'department': return `Department · ${value}`
    case 'year': return `Year · ${value}`
    case 'author': return `Author · ${value}`
    case 'advisor': return `Advisor · ${value}`
    case 'type': return `Type · ${value.replaceAll('_', ' ')}`
    case 'keyword': return `Keyword · ${value}`
    default: return value
  }
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
