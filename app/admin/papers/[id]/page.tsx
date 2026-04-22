import Link from 'next/link'
import { notFound } from 'next/navigation'
import { db } from '@/lib/db'
import { PaperForm } from '@/components/admin/PaperForm'
import { StatusBadge } from '@/components/admin/StatusBadge'
import { StatusActions } from './StatusActions'
import { updatePaper } from '@/app/actions/papers'
import { formatDate } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function AdminPaperEditPage({ params }: { params: { id: string } }) {
  const paper = await db.paper.findUnique({
    where: { id: params.id },
    include: {
      department: true,
      authors: { include: { author: true }, orderBy: { position: 'asc' } },
      advisors: { include: { advisor: true } },
      keywords: { include: { keyword: true } },
      activity: { orderBy: { createdAt: 'desc' }, take: 12, include: { user: true } },
    },
  })
  if (!paper) notFound()

  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })

  const initial = {
    title: paper.title,
    subtitle: paper.subtitle,
    abstract: paper.abstract,
    year: paper.year,
    publicationDate: paper.publicationDate?.toISOString() ?? null,
    language: paper.language,
    degreeLevel: paper.degreeLevel,
    documentType: paper.documentType,
    departmentSlug: paper.department?.slug ?? '',
    authors: paper.authors.map((a) => ({ name: a.author.name, email: a.author.email, orcid: a.author.orcid })),
    advisors: paper.advisors.map((a) => ({ name: a.advisor.name, email: a.advisor.email, role: a.role })),
    keywords: paper.keywords.map((k) => k.keyword.term),
    license: paper.license,
    embargoUntil: paper.embargoUntil?.toISOString() ?? null,
  }

  const bound = updatePaper.bind(null, paper.id)

  return (
    <div className="grid gap-10 md:grid-cols-[1fr_18rem]">
      <div>
        <Link href="/admin/papers" className="text-xs uppercase tracking-widest text-ink-500 no-underline hover:text-ink-800">
          ← Papers
        </Link>
        <div className="mt-2 flex items-center gap-3">
          <h1 className="font-serif text-3xl text-ink-900">{paper.title}</h1>
          <StatusBadge status={paper.status} />
        </div>
        <p className="mt-1 text-sm text-ink-500">
          Updated {formatDate(paper.updatedAt)} · slug <code className="rounded bg-ink-100 px-1.5 py-0.5">{paper.slug}</code>
        </p>

        <div className="mt-10">
          <PaperForm
            action={bound}
            initial={initial as any}
            departments={departments.map((d) => ({ slug: d.slug, name: d.name }))}
            submitLabel="Save changes"
            busyLabel="Saving…"
          />
        </div>
      </div>

      <aside className="space-y-6">
        <StatusActions id={paper.id} status={paper.status} slug={paper.slug} />

        <div className="rounded-xl border border-ink-100 bg-white p-5">
          <div className="mb-3 text-xs uppercase tracking-widest text-ink-500">Activity</div>
          <ul className="space-y-3 text-sm">
            {paper.activity.map((a) => (
              <li key={a.id} className="flex items-start gap-2">
                <span className="mt-0.5 inline-block h-1.5 w-1.5 rounded-full bg-ink-300" />
                <div>
                  <div className="text-ink-800">{a.action}</div>
                  <div className="text-xs text-ink-500">
                    {a.user?.name || a.user?.email || 'system'} · {formatDate(a.createdAt)}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </aside>
    </div>
  )
}
