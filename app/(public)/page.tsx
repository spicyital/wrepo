import Link from 'next/link'
import { db } from '@/lib/db'
import { PaperCard } from '@/components/PaperCard'
import { SearchBar } from '@/components/SearchBar'

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const [recent, departments, totalCount] = await Promise.all([
    db.paper.findMany({
      where: { status: 'published', deletedAt: null },
      orderBy: { publishedAt: 'desc' },
      take: 6,
      include: {
        department: true,
        authors: { include: { author: true }, orderBy: { position: 'asc' } },
      },
    }),
    db.department.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { papers: { where: { status: 'published', deletedAt: null } } } } },
    }),
    db.paper.count({ where: { status: 'published', deletedAt: null } }),
  ])

  return (
    <>
      <section className="border-b border-ink-100 bg-ink-50/40">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-widest text-ink-500">WRepo · Academic Archive</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-ink-900 md:text-6xl">
            A quiet home for student research.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            Undergraduate theses, working papers, and departmental scholarship — collected,
            reviewed, and made permanently discoverable.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBar size="lg" />
          </div>
          <p className="mt-4 text-sm text-ink-500">
            {totalCount.toLocaleString()} published {totalCount === 1 ? 'paper' : 'papers'} and counting.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-ink-900">Departments</h2>
          <Link href="/browse" className="text-sm text-accent-600 no-underline hover:text-accent-700">
            Browse all →
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.map((d) => (
            <Link
              key={d.id}
              href={`/browse/department/${d.slug}`}
              className="group rounded-xl border border-ink-100 bg-white p-5 no-underline transition-colors hover:border-ink-300"
            >
              <div className="flex items-center justify-between">
                <span className="font-serif text-lg text-ink-900 group-hover:text-accent-700">{d.name}</span>
                <span className="text-xs text-ink-500">{d._count.papers}</span>
              </div>
              {d.about && <p className="mt-2 line-clamp-2 text-sm text-ink-600">{d.about}</p>}
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-ink-900">Recent submissions</h2>
          <Link href="/browse" className="text-sm text-accent-600 no-underline hover:text-accent-700">
            See more →
          </Link>
        </div>
        <div className="mt-4">
          {recent.length === 0 ? (
            <p className="py-12 text-center text-sm text-ink-500">
              No papers published yet. Run <code className="rounded bg-ink-100 px-1.5 py-0.5">npm run db:seed</code> to
              populate demo data.
            </p>
          ) : (
            recent.map((p) => (
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
      </section>
    </>
  )
}
