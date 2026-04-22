'use client'

import Link from 'next/link'
import { useState, useTransition } from 'react'
import { setPaperStatus } from '@/app/actions/papers'
import { Button } from '@/components/ui/Button'

type Status = 'draft' | 'submitted' | 'approved' | 'rejected' | 'published' | 'archived'

const primary: Partial<Record<Status, { label: string; next: Status }>> = {
  submitted: { label: 'Approve', next: 'approved' },
  approved:  { label: 'Publish',  next: 'published' },
  rejected:  { label: 'Re-open for review', next: 'submitted' },
  draft:     { label: 'Send to review', next: 'submitted' },
  archived:  { label: 'Restore', next: 'approved' },
}

export function StatusActions({
  id,
  status,
  slug,
}: {
  id: string
  status: Status
  slug: string
}) {
  const [pending, start] = useTransition()
  const [err, setErr] = useState<string | null>(null)

  function go(next: string) {
    setErr(null)
    start(async () => {
      const res = await setPaperStatus(id, next)
      if (!res.ok) setErr(res.error ?? 'Failed.')
    })
  }

  const main = primary[status]

  return (
    <div className="rounded-xl border border-ink-100 bg-white p-5">
      <div className="mb-3 text-xs uppercase tracking-widest text-ink-500">Actions</div>
      <div className="flex flex-col gap-2">
        {main && (
          <Button onClick={() => go(main.next)} disabled={pending}>
            {pending ? 'Working…' : main.label}
          </Button>
        )}
        {status === 'submitted' && (
          <Button variant="secondary" onClick={() => go('rejected')} disabled={pending}>
            Reject
          </Button>
        )}
        {status === 'approved' && (
          <Button variant="secondary" onClick={() => go('submitted')} disabled={pending}>
            Send back for review
          </Button>
        )}
        {status === 'published' && (
          <Button variant="secondary" onClick={() => go('approved')} disabled={pending}>
            Unpublish
          </Button>
        )}
        {status !== 'archived' && (
          <Button variant="danger" onClick={() => go('archived')} disabled={pending}>
            Archive
          </Button>
        )}
        {status === 'published' && (
          <Link
            href={`/papers/${slug}`}
            target="_blank"
            rel="noreferrer"
            className="mt-2 text-center text-sm text-accent-600 no-underline hover:text-accent-700"
          >
            View public page ↗
          </Link>
        )}
      </div>
      {err && (
        <div
          role="alert"
          className="mt-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
        >
          {err}
        </div>
      )}
    </div>
  )
}
