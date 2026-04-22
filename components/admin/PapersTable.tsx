import Link from 'next/link'
import { StatusBadge } from './StatusBadge'
import { formatDate } from '@/lib/utils'

interface Row {
  id: string
  title: string
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'published' | 'archived'
  year: number
  updatedAt: Date | string
  department?: { name: string } | null
  submittedBy?: { name: string | null; email: string } | null
}

export function PapersTable({ rows }: { rows: Row[] }) {
  if (rows.length === 0) {
    return <p className="py-12 text-center text-sm text-ink-500">No papers match these filters.</p>
  }
  return (
    <div className="overflow-x-auto rounded-xl border border-ink-100">
      <table className="w-full text-left text-sm">
        <thead className="bg-ink-50 text-xs uppercase tracking-wider text-ink-500">
          <tr>
            <th className="px-4 py-3">Title</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Department</th>
            <th className="px-4 py-3">Year</th>
            <th className="px-4 py-3">Submitter</th>
            <th className="px-4 py-3">Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t border-ink-100 hover:bg-ink-50/60">
              <td className="px-4 py-3">
                <Link href={`/admin/papers/${r.id}`} className="text-ink-900 no-underline hover:text-accent-700">
                  {r.title}
                </Link>
              </td>
              <td className="px-4 py-3">
                <StatusBadge status={r.status} />
              </td>
              <td className="px-4 py-3 text-ink-700">{r.department?.name ?? '—'}</td>
              <td className="px-4 py-3 text-ink-700">{r.year}</td>
              <td className="px-4 py-3 text-ink-700">
                {r.submittedBy ? r.submittedBy.name || r.submittedBy.email : '—'}
              </td>
              <td className="px-4 py-3 text-ink-500">{formatDate(r.updatedAt)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
