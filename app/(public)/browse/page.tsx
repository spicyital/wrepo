import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { SearchBar } from '@/components/SearchBar'

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Browse published papers by department, year, author, advisor, type, or keyword.',
}

export const dynamic = 'force-dynamic'

export default async function BrowseIndex() {
  const [departments, years, authors, advisors, keywords] = await Promise.all([
    db.department.findMany({
      where: { papers: { some: { status: 'published', deletedAt: null } } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { papers: { where: { status: 'published', deletedAt: null } } } } },
    }),
    db.paper.groupBy({
      by: ['year'],
      where: { status: 'published', deletedAt: null },
      _count: true,
      orderBy: { year: 'desc' },
    }),
    db.author.findMany({
      where: { papers: { some: { paper: { status: 'published', deletedAt: null } } } },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    db.advisor.findMany({
      where: { papers: { some: { paper: { status: 'published', deletedAt: null } } } },
      orderBy: { name: 'asc' },
      take: 100,
    }),
    db.keyword.findMany({
      where: { papers: { some: { paper: { status: 'published', deletedAt: null } } } },
      orderBy: { term: 'asc' },
      take: 100,
    }),
  ])
  const hasPublishedCorpus = years.length > 0

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-ink-500">Browse</p>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">Find a paper.</h1>
      <p className="mt-3 max-w-2xl text-ink-600">
        Browse published papers by department, year, author, advisor, type, or keyword. For full-text
        queries, use <Link href="/search" className="text-accent-600">search</Link>.
      </p>
      <div className="mt-6 max-w-2xl">
        <SearchBar />
      </div>

      {!hasPublishedCorpus && (
        <div className="mt-8 rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-6">
          <p className="font-medium text-ink-900">No published papers are live yet.</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
            Browse links will populate automatically once public records are published.
          </p>
        </div>
      )}

      <Facet title="Departments">
        {departments.length === 0 ? (
          <EmptyFacet message="Published departments will appear here once records are available." />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-3">
            {departments.map((d) => (
              <Link
                key={d.id}
                href={`/browse/department/${d.slug}`}
                className="flex items-center justify-between rounded-md border border-ink-100 px-4 py-3 text-sm text-ink-800 no-underline hover:border-ink-300"
              >
                <span>{d.name}</span>
                <span className="text-xs text-ink-500">{d._count.papers}</span>
              </Link>
            ))}
          </div>
        )}
      </Facet>

      <Facet title="By year">
        {years.length === 0 ? (
          <EmptyFacet message="Publication years will appear here once papers are published." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {years.map((y) => (
              <Link
                key={y.year}
                href={`/browse/year/${y.year}`}
                className="rounded-full border border-ink-100 bg-white px-3 py-1 text-sm text-ink-800 no-underline hover:border-ink-300"
              >
                {y.year} <span className="text-xs text-ink-500">· {y._count}</span>
              </Link>
            ))}
          </div>
        )}
      </Facet>

      <Facet title="By document type">
        {!hasPublishedCorpus ? (
          <EmptyFacet message="Document types will appear here once papers are published." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {['thesis', 'research_paper', 'article', 'report', 'working_paper', 'other'].map((t) => (
              <Link
                key={t}
                href={`/browse/type/${t}`}
                className="rounded-full border border-ink-100 bg-white px-3 py-1 text-sm text-ink-800 no-underline capitalize hover:border-ink-300"
              >
                {t.replaceAll('_', ' ')}
              </Link>
            ))}
          </div>
        )}
      </Facet>

      <Facet title="Authors">
        <FacetList
          items={authors.map((a) => ({ href: `/browse/author/${a.slug}`, label: a.name }))}
          emptyMessage="Published authors will appear here once records are available."
        />
      </Facet>

      <Facet title="Advisors">
        <FacetList
          items={advisors.map((a) => ({ href: `/browse/advisor/${a.slug}`, label: a.name }))}
          emptyMessage="Advisor listings will appear here once published papers are available."
        />
      </Facet>

      <Facet title="Keywords">
        {keywords.length === 0 ? (
          <EmptyFacet message="Keywords will appear here once published papers are tagged." />
        ) : (
          <div className="flex flex-wrap gap-2">
            {keywords.map((k) => (
              <Link
                key={k.id}
                href={`/browse/keyword/${k.slug}`}
                className="rounded-full bg-ink-50 px-3 py-1 text-xs text-ink-700 no-underline hover:bg-ink-100"
              >
                #{k.term}
              </Link>
            ))}
          </div>
        )}
      </Facet>
    </div>
  )
}

function Facet({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mt-12">
      <h2 className="mb-4 font-serif text-xl text-ink-900">{title}</h2>
      {children}
    </section>
  )
}

function FacetList({
  items,
  emptyMessage = 'Nothing public here yet.',
}: {
  items: { href: string; label: string }[]
  emptyMessage?: string
}) {
  if (items.length === 0) return <EmptyFacet message={emptyMessage} />
  return (
    <ul className="grid gap-1 text-sm text-ink-800 sm:grid-cols-2 md:grid-cols-3">
      {items.map((i) => (
        <li key={i.href}>
          <Link href={i.href} className="no-underline hover:text-accent-700">{i.label}</Link>
        </li>
      ))}
    </ul>
  )
}

function EmptyFacet({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-ink-200 bg-ink-50/60 px-4 py-3 text-sm text-ink-500">
      {message}
    </div>
  )
}
