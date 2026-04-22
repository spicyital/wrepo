import Link from 'next/link'
import { db } from '@/lib/db'
import { PapersTable } from '@/components/admin/PapersTable'
import { Input } from '@/components/ui/Input'

export default async function AdminPapersPage({
  searchParams,
}: {
  searchParams: { status?: string; q?: string }
}) {
  const statuses = ['all', 'submitted', 'approved', 'published', 'draft', 'rejected', 'archived'] as const
  const requestedStatus = searchParams.status ?? 'all'
  const status = statuses.includes(requestedStatus as (typeof statuses)[number])
    ? (requestedStatus as (typeof statuses)[number])
    : 'all'
  const q = (searchParams.q ?? '').trim()

  const papers = await db.paper.findMany({
    where: {
      ...(status !== 'all' ? { status } : {}),
      ...(q
        ? {
            OR: [
              { title: { contains: q, mode: 'insensitive' } },
              { abstract: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {}),
    },
    orderBy: { updatedAt: 'desc' },
    include: { department: true, submittedBy: true },
    take: 100,
  })

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-serif text-3xl text-ink-900">Papers</h1>
          <p className="mt-1 text-sm text-ink-500">{papers.length} shown</p>
        </div>
        <form className="flex items-center gap-2">
          <Input name="q" defaultValue={q} placeholder="Search title / abstract…" className="w-64" />
          <input type="hidden" name="status" value={status} />
          <button type="submit" className="rounded-md border border-ink-200 px-3 py-2 text-sm text-ink-800 hover:border-ink-300">
            Filter
          </button>
        </form>
      </div>

      <div className="mb-5 flex flex-wrap gap-2 text-sm">
        {statuses.map((s) => (
          <Link
            key={s}
            href={`/admin/papers?${new URLSearchParams({ status: s, ...(q ? { q } : {}) }).toString()}`}
            className={[
              'rounded-full border px-3 py-1 capitalize no-underline',
              status === s ? 'border-ink-900 bg-ink-900 text-white' : 'border-ink-200 text-ink-700 hover:border-ink-300',
            ].join(' ')}
          >
            {s}
          </Link>
        ))}
      </div>

      <PapersTable rows={papers} />
    </div>
  )
}
