import Link from 'next/link'
import type { Metadata } from 'next'
import { db } from '@/lib/db'

export const metadata: Metadata = {
  title: 'Browse',
  description: 'Browse papers by department, year, author, advisor, type, or keyword.',
}

export const dynamic = 'force-dynamic'

export default async function BrowseIndex() {
  const [departments, years, authors, advisors, keywords] = await Promise.all([
    db.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { papers: { where: { status: 'published', deletedAt: null } } } } },
    }),
    db.paper.groupBy({
      by: ['year'],
      where: { status: 'published', deletedAt: null },
      _count: true,
      orderBy: { year: 'desc' },
    }),
    db.author.findMany({ orderBy: { name: 'asc' }, take: 100 }),
    db.advisor.findMany({ orderBy: { name: 'asc' }, take: 100 }),
    db.keyword.findMany({ orderBy: { term: 'asc' }, take: 100 }),
  ])

  return (
    <div className="mx-auto max-w-6xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-ink-500">Browse</p>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">Find a paper.</h1>
      <p className="mt-3 max-w-2xl text-ink-600">
        Browse by facet. For full-text queries, use <Link href="/search" className="text-accent-600">search</Link>.
      </p>

      <Facet title="Departments">
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
      </Facet>

      <Facet title="By year">
        <div className="flex flex-wrap gap-2">
          {years.map((y) => (
            <Link
              key={y.year}
              href={`/browse/year/${y.year}`}
              className="rounded-full border border-ink-100 bg-white px-3 py-1 text-sm text-ink-800 no-underline hover:border-ink-300"
            >
              {y.year} <span className="text-xs text-ink-500">·{' '}{y._count}</span>
            </Link>
          ))}
        </div>
      </Facet>

      <Facet title="By document type">
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
      </Facet>

      <Facet title="Authors">
        <FacetList items={authors.map((a) => ({ href: `/browse/author/${a.slug}`, label: a.name }))} />
      </Facet>

      <Facet title="Advisors">
        <FacetList items={advisors.map((a) => ({ href: `/browse/advisor/${a.slug}`, label: a.name }))} />
      </Facet>

      <Facet title="Keywords">
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

function FacetList({ items }: { items: { href: string; label: string }[] }) {
  if (items.length === 0) return <p className="text-sm text-ink-500">None yet.</p>
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
