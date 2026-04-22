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
      where: { papers: { some: { status: 'published', deletedAt: null } } },
      orderBy: { name: 'asc' },
      include: { _count: { select: { papers: { where: { status: 'published', deletedAt: null } } } } },
    }),
    db.paper.count({ where: { status: 'published', deletedAt: null } }),
  ])

  return (
    <>
      <section className="border-b border-ink-100 bg-ink-50/40">
        <div className="mx-auto max-w-5xl px-6 py-20 md:py-28">
          <p className="text-xs uppercase tracking-widest text-ink-500">WRepo / Academic Repository</p>
          <h1 className="mt-4 max-w-3xl font-serif text-4xl leading-tight text-ink-900 md:text-6xl">
            Undergraduate research, published with the care it deserves.
          </h1>
          <p className="mt-5 max-w-2xl text-lg leading-relaxed text-ink-600">
            WRepo is a public repository for undergraduate theses, student research papers, and working
            papers. Published records are citable, structured, and easy to discover.
          </p>
          <div className="mt-8 max-w-2xl">
            <SearchBar size="lg" />
          </div>
          <div className="mt-5 flex flex-wrap gap-3">
            <Link
              href="/browse"
              className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-800 no-underline hover:border-ink-300"
            >
              Browse all papers
            </Link>
            <Link
              href="/search"
              className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-800 no-underline hover:border-ink-300"
            >
              Go to search
            </Link>
            <Link
              href="/about"
              className="rounded-full border border-ink-200 bg-white px-4 py-2 text-sm text-ink-800 no-underline hover:border-ink-300"
            >
              About WRepo
            </Link>
          </div>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-500">
            Published papers and metadata on WRepo are publicly accessible.{' '}
            {totalCount.toLocaleString()} published {totalCount === 1 ? 'paper' : 'papers'} and counting.
            Unpublished submissions and embargoed files remain outside the public corpus.
          </p>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            <FeatureCard
              title="Publicly discoverable"
              body="Canonical paper pages, structured metadata, and machine-readable endpoints support search engines, libraries, and responsible LLM access."
            />
            <FeatureCard
              title="Citation-ready"
              body="Each public paper page includes a stable URL, citation formats, and clear publication metadata."
            />
            <FeatureCard
              title="Lightweight stewardship"
              body="The repository is designed to be maintainable by one developer without sacrificing editorial control."
            />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-ink-900">Departments</h2>
          <Link href="/browse" className="text-sm text-accent-600 no-underline hover:text-accent-700">
            Browse all papers
          </Link>
        </div>
        <div className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {departments.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 bg-ink-50/60 p-6 md:col-span-2 lg:col-span-3">
              <p className="font-medium text-ink-900">No published departments yet.</p>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-ink-500">
                Department listings will appear automatically once published papers are added to the public
                repository.
              </p>
            </div>
          ) : (
            departments.map((d) => (
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
            ))
          )}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="flex items-baseline justify-between">
          <h2 className="font-serif text-2xl text-ink-900">Recently published</h2>
          <Link href="/browse" className="text-sm text-accent-600 no-underline hover:text-accent-700">
            View archive
          </Link>
        </div>
        <div className="mt-4">
          {recent.length === 0 ? (
            <div className="rounded-xl border border-dashed border-ink-200 bg-white py-12 text-center">
              <p className="text-sm font-medium text-ink-800">No published papers are live yet.</p>
              <p className="mt-2 text-sm text-ink-500">
                This section will populate automatically once public records are published.
              </p>
            </div>
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

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <h2 className="font-serif text-lg text-ink-900">{title}</h2>
      <p className="mt-2 text-sm leading-relaxed text-ink-600">{body}</p>
    </div>
  )
}
