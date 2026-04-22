import type { Metadata } from 'next'
import Link from 'next/link'
import { SearchBar } from '@/components/SearchBar'
import { PaperCard } from '@/components/PaperCard'
import { search } from '@/lib/search'
import { db } from '@/lib/db'
import { documentTypes } from '@/lib/validation/paper'

export const metadata: Metadata = { title: 'Search' }
export const dynamic = 'force-dynamic'

const PAGE_SIZE = 20

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; department?: string; year?: string; type?: string; page?: string }
}) {
  const q = (searchParams.q ?? '').trim()
  const departmentSlug = searchParams.department?.trim() || undefined
  const year = searchParams.year ? Number(searchParams.year) : undefined
  const documentType = searchParams.type?.trim() || undefined
  const validDocumentType =
    documentType && documentTypes.includes(documentType as (typeof documentTypes)[number])
      ? documentType
      : undefined
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1)
  const offset = (page - 1) * PAGE_SIZE

  const [{ hits, total }, departments, years] = await Promise.all([
    search().query({
      q,
      filters: { departmentSlug, year, documentType: validDocumentType },
      limit: PAGE_SIZE,
      offset,
    }),
    db.department.findMany({ orderBy: { name: 'asc' } }),
    db.paper.groupBy({
      by: ['year'],
      where: { status: 'published', deletedAt: null },
      _count: true,
      orderBy: { year: 'desc' },
    }),
  ])

  const hitIds = hits.map((h) => h.id)
  const detailed = hitIds.length
    ? await db.paper.findMany({
        where: { id: { in: hitIds } },
        include: {
          department: true,
          authors: { include: { author: true }, orderBy: { position: 'asc' } },
        },
      })
    : []
  const byId = new Map(detailed.map((p) => [p.id, p]))
  const ordered = hits.map((h) => byId.get(h.id)).filter((p): p is (typeof detailed)[number] => !!p)

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))

  function pageHref(next: number) {
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (departmentSlug) params.set('department', departmentSlug)
    if (year !== undefined) params.set('year', String(year))
    if (validDocumentType) params.set('type', validDocumentType)
    if (next > 1) params.set('page', String(next))
    const qs = params.toString()
    return qs ? `/search?${qs}` : '/search'
  }

  return (
    <div className="mx-auto max-w-5xl px-6 py-16">
      <p className="text-xs uppercase tracking-widest text-ink-500">Search</p>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">Find across the archive.</h1>
      <div className="mt-6 max-w-2xl">
        <SearchBar defaultValue={q} />
      </div>

      <div className="mt-6 flex flex-wrap gap-2 text-sm">
        <Link
          href={`/search?${new URLSearchParams({ ...(q ? { q } : {}) }).toString()}`}
          className={chip(!departmentSlug && !year && !documentType)}
        >
          All results
        </Link>
        {departments.slice(0, 8).map((d) => (
          <Link
            key={d.id}
            href={`/search?${new URLSearchParams({ ...(q ? { q } : {}), department: d.slug }).toString()}`}
            className={chip(departmentSlug === d.slug)}
          >
            {d.name}
          </Link>
        ))}
        {years.slice(0, 6).map((y) => (
          <Link
            key={y.year}
            href={`/search?${new URLSearchParams({ ...(q ? { q } : {}), year: String(y.year) }).toString()}`}
            className={chip(year === y.year)}
          >
            {y.year}
          </Link>
        ))}
      </div>

      <p className="mt-8 text-sm text-ink-500">
        {total.toLocaleString()} {total === 1 ? 'result' : 'results'}
        {q && <> for <span className="text-ink-800">“{q}”</span></>}
      </p>

      <div className="mt-4">
        {ordered.length === 0 ? (
          <div className="rounded-xl border border-ink-100 bg-white py-16 text-center">
            <p className="text-sm text-ink-500">No matches. Try fewer words or different filters.</p>
          </div>
        ) : (
          ordered.map((p) => (
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

      {totalPages > 1 && (
        <nav className="mt-10 flex items-center justify-between text-sm" aria-label="Pagination">
          {page > 1 ? (
            <Link href={pageHref(page - 1)} className="text-accent-600 hover:text-accent-700">
              ← Previous
            </Link>
          ) : (
            <span />
          )}
          <span className="text-ink-500">
            Page {page} of {totalPages}
          </span>
          {page < totalPages ? (
            <Link href={pageHref(page + 1)} className="text-accent-600 hover:text-accent-700">
              Next →
            </Link>
          ) : (
            <span />
          )}
        </nav>
      )}
    </div>
  )
}

function chip(active: boolean) {
  return [
    'rounded-full border px-3 py-1 no-underline',
    active ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 text-ink-700 hover:border-ink-300',
  ].join(' ')
}
