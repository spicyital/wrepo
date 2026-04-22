import Link from 'next/link'
import { db } from '@/lib/db'
import { Card, CardBody, CardHeader, CardTitle } from '@/components/ui/Card'

export default async function AdminHome() {
  const [byStatus, recent] = await Promise.all([
    db.paper.groupBy({
      by: ['status'],
      _count: true,
    }),
    db.paper.findMany({
      orderBy: { updatedAt: 'desc' },
      take: 8,
      include: { department: true, submittedBy: true },
    }),
  ])

  const counts = Object.fromEntries(byStatus.map((r) => [r.status, r._count]))

  return (
    <div className="space-y-10">
      <div>
        <h1 className="font-serif text-3xl text-ink-900">Dashboard</h1>
        <p className="mt-1 text-sm text-ink-500">Review queue, recent activity, and shortcuts.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Submitted" value={counts.submitted ?? 0} href="/admin/papers?status=submitted" />
        <StatCard label="Approved" value={counts.approved ?? 0} href="/admin/papers?status=approved" />
        <StatCard label="Published" value={counts.published ?? 0} href="/admin/papers?status=published" />
        <StatCard label="Drafts" value={counts.draft ?? 0} href="/admin/papers?status=draft" />
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recently updated</CardTitle>
            <Link href="/admin/papers" className="text-sm text-accent-600 no-underline hover:text-accent-700">
              All papers →
            </Link>
          </div>
        </CardHeader>
        <CardBody>
          <ul className="divide-y divide-ink-100">
            {recent.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-3">
                <Link href={`/admin/papers/${p.id}`} className="text-ink-900 no-underline hover:text-accent-700">
                  {p.title}
                </Link>
                <span className="text-xs uppercase tracking-wider text-ink-500">{p.status}</span>
              </li>
            ))}
            {recent.length === 0 && <li className="py-3 text-ink-500">No papers yet.</li>}
          </ul>
        </CardBody>
      </Card>
    </div>
  )
}

function StatCard({ label, value, href }: { label: string; value: number; href: string }) {
  return (
    <Link
      href={href}
      className="block rounded-xl border border-ink-100 bg-white p-5 no-underline transition-colors hover:border-ink-300"
    >
      <div className="text-xs uppercase tracking-widest text-ink-500">{label}</div>
      <div className="mt-2 font-serif text-3xl text-ink-900">{value}</div>
    </Link>
  )
}
