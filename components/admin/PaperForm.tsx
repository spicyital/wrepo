'use client'

import { useState } from 'react'
import { Button } from '../ui/Button'
import { Input, Textarea, Select } from '../ui/Input'
import { degreeLevels, documentTypes } from '@/lib/validation/paper'

export interface PaperFormValues {
  title: string
  subtitle?: string | null
  abstract: string
  year: number
  publicationDate?: string | null
  language: string
  degreeLevel: string
  documentType: string
  departmentSlug: string
  doi?: string | null
  authors: { name: string; email?: string | null; orcid?: string | null }[]
  advisors: { name: string; email?: string | null; role?: string | null }[]
  keywords: string[]
  license?: string | null
  embargoUntil?: string | null
}

export function PaperForm({
  action,
  initial,
  departments,
  busyLabel = 'Saving…',
  submitLabel = 'Save',
  includeFile = true,
  pdfRequired = false,
}: {
  action: (formData: FormData) => Promise<{ ok: boolean; error?: string; redirectTo?: string }>
  initial?: Partial<PaperFormValues>
  departments: { slug: string; name: string }[]
  busyLabel?: string
  submitLabel?: string
  includeFile?: boolean
  pdfRequired?: boolean
}) {
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [authors, setAuthors] = useState(
    initial?.authors?.length ? initial.authors : [{ name: '', email: '', orcid: '' }],
  )
  const [advisors, setAdvisors] = useState(initial?.advisors ?? [])
  const [keywords, setKeywords] = useState((initial?.keywords ?? []).join(', '))
  const publicationDate = toDateInputValue(initial?.publicationDate)
  const embargoUntil = toDateInputValue(initial?.embargoUntil)

  return (
    <form
      className="space-y-8"
      onSubmit={async (e) => {
        e.preventDefault()
        setErr(null)
        setBusy(true)
        const fd = new FormData(e.currentTarget)
        fd.set('authors', JSON.stringify(authors.filter((a) => a.name.trim())))
        fd.set('advisors', JSON.stringify(advisors.filter((a) => a.name.trim())))
        fd.set(
          'keywords',
          JSON.stringify(keywords.split(',').map((k) => k.trim()).filter(Boolean)),
        )
        try {
          const res = await action(fd)
          if (!res.ok) setErr(res.error ?? 'Something went wrong.')
          else if (res.redirectTo) window.location.assign(res.redirectTo)
        } finally {
          setBusy(false)
        }
      }}
      encType="multipart/form-data"
    >
      <Field label="Title" required>
        <Input name="title" defaultValue={initial?.title ?? ''} required maxLength={400} />
      </Field>

      <Field label="Subtitle">
        <Input name="subtitle" defaultValue={initial?.subtitle ?? ''} maxLength={400} />
      </Field>

      <Field label="Abstract" required>
        <Textarea name="abstract" required minLength={50} defaultValue={initial?.abstract ?? ''} rows={8} />
      </Field>

      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Year" required>
          <Input
            name="year"
            type="number"
            min={1900}
            max={new Date().getFullYear() + 1}
            defaultValue={initial?.year ?? new Date().getFullYear()}
            required
          />
        </Field>
        <Field label="Language">
          <Input name="language" defaultValue={initial?.language ?? 'en'} maxLength={8} />
        </Field>
        <Field label="Publication date">
          <Input name="publicationDate" type="date" defaultValue={publicationDate} />
        </Field>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Field label="Department" required>
          <Select name="departmentSlug" defaultValue={initial?.departmentSlug ?? ''} required>
            <option value="">Select a department…</option>
            {departments.map((d) => (
              <option key={d.slug} value={d.slug}>
                {d.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Degree level">
          <Select name="degreeLevel" defaultValue={initial?.degreeLevel ?? 'undergraduate'}>
            {degreeLevels.map((d) => (
              <option key={d} value={d}>{d.replaceAll('_', ' ')}</option>
            ))}
          </Select>
        </Field>
        <Field label="Document type">
          <Select name="documentType" defaultValue={initial?.documentType ?? 'thesis'}>
            {documentTypes.map((d) => (
              <option key={d} value={d}>{d.replaceAll('_', ' ')}</option>
            ))}
          </Select>
        </Field>
      </div>

      <RepeatablePeople
        label="Authors"
        rows={authors}
        setRows={setAuthors}
        hint="List authors in publication order. Add ORCID identifiers when available."
        withOrcid
      />

      <RepeatablePeople
        label="Advisors"
        rows={advisors}
        setRows={setAdvisors}
        hint="Optional. Include advisors, supervisors, or readers exactly as they should appear publicly."
        withRole
      />

      <Field label="Keywords" hint="Comma-separated. Use 3-8 precise terms that readers would actually search for.">
        <Input value={keywords} onChange={(e) => setKeywords(e.target.value)} />
      </Field>

      <div className="grid gap-6 md:grid-cols-3">
        <Field label="DOI" hint="Optional. Enter a DOI or doi.org URL if one has already been assigned.">
          <Input name="doi" defaultValue={initial?.doi ?? ''} placeholder="10.1234/example.2026.001" />
        </Field>
        <Field label="License" hint="e.g. CC-BY-4.0. Leave blank only if rights are reserved or undecided.">
          <Input name="license" defaultValue={initial?.license ?? ''} />
        </Field>
        <Field label="Embargo until" hint="Optional. Metadata stays public, but the file remains unavailable until this date.">
          <Input name="embargoUntil" type="date" defaultValue={embargoUntil} />
        </Field>
      </div>

      {includeFile && (
        <div className="grid gap-6 md:grid-cols-2">
          <Field label="PDF file" hint="Required. Max 25 MB. PDF only.">
            <input name="pdf" type="file" accept="application/pdf" required={pdfRequired} />
          </Field>
          <Field label="Cover image" hint="Optional. Used for link previews when provided.">
            <input name="cover" type="file" accept="image/*" />
          </Field>
        </div>
      )}

      {err && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{err}</div>}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={busy}>
          {busy ? busyLabel : submitLabel}
        </Button>
      </div>
    </form>
  )
}

function toDateInputValue(value?: string | null) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.valueOf())) return ''
  return date.toISOString().slice(0, 10)
}

function Field({
  label,
  hint,
  required,
  children,
}: {
  label: string
  hint?: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-ink-800">
        {label}
        {required && <span className="ml-0.5 text-red-600">*</span>}
      </span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-500">{hint}</span>}
    </label>
  )
}

function RepeatablePeople<T extends { name: string; email?: string | null; orcid?: string | null; role?: string | null }>({
  label,
  rows,
  setRows,
  hint,
  withOrcid,
  withRole,
}: {
  label: string
  rows: T[]
  setRows: (rows: T[]) => void
  hint?: string
  withOrcid?: boolean
  withRole?: boolean
}) {
  return (
    <div>
      <div className="mb-2 flex items-end justify-between">
        <div>
          <div className="text-sm font-medium text-ink-800">{label}</div>
          {hint && <div className="text-xs text-ink-500">{hint}</div>}
        </div>
        <button
          type="button"
          onClick={() =>
            setRows([...rows, { name: '', email: '', ...(withOrcid ? { orcid: '' } : {}), ...(withRole ? { role: '' } : {}) } as T])
          }
          className="text-xs text-accent-600 hover:text-accent-700"
        >
          + Add
        </button>
      </div>
      <div className="space-y-2">
        {rows.map((row, i) => (
          <div key={i} className="grid gap-2 md:grid-cols-[1fr_1fr_1fr_auto]">
            <Input
              placeholder="Name"
              value={row.name}
              onChange={(e) => {
                const next = [...rows]
                next[i] = { ...next[i], name: e.target.value }
                setRows(next)
              }}
            />
            <Input
              placeholder="Email (optional)"
              value={row.email ?? ''}
              onChange={(e) => {
                const next = [...rows]
                next[i] = { ...next[i], email: e.target.value }
                setRows(next)
              }}
            />
            {withOrcid && (
              <Input
                placeholder="ORCID (optional)"
                value={row.orcid ?? ''}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...next[i], orcid: e.target.value }
                  setRows(next)
                }}
              />
            )}
            {withRole && (
              <Input
                placeholder="Role (e.g. primary)"
                value={row.role ?? ''}
                onChange={(e) => {
                  const next = [...rows]
                  next[i] = { ...next[i], role: e.target.value }
                  setRows(next)
                }}
              />
            )}
            <button
              type="button"
              onClick={() => setRows(rows.filter((_, j) => j !== i))}
              className="text-xs text-ink-500 hover:text-red-600"
              aria-label={`Remove ${label.toLowerCase()} ${i + 1}`}
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
