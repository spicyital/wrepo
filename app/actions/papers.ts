'use server'

import type { Prisma } from '@prisma/client'
import { ZodError } from 'zod'
import { getServerSession } from 'next-auth'
import { revalidatePath } from 'next/cache'
import { authOptions, canEdit, canPublish, canSubmit } from '@/lib/auth'
import { db } from '@/lib/db'
import { storage } from '@/lib/storage'
import { paperInputSchema, paperStatuses } from '@/lib/validation/paper'
import { logger } from '@/lib/logger'
import {
  assertImage,
  assertPdf,
  generateCoverKey,
  generatePdfKey,
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
  UploadError,
} from '@/lib/uploads'
import {
  buildStatusTransitionData,
  canTransition,
  connectAdvisors,
  connectAuthors,
  connectKeywords,
  ensureUniquePaperSlug,
} from '@/lib/papers/service'

export type ActionResult = { ok: boolean; error?: string; redirectTo?: string; id?: string }

async function removeStoredKeys(keys: Array<string | null | undefined>) {
  const uniqueKeys = [...new Set(keys.filter((key): key is string => typeof key === 'string' && key.length > 0))]
  if (uniqueKeys.length === 0) return

  const results = await Promise.allSettled(uniqueKeys.map((key) => storage().remove(key)))
  results.forEach((result, index) => {
    if (result.status === 'rejected') {
      logger.warn('storage cleanup failed', {
        key: uniqueKeys[index],
        err: result.reason instanceof Error ? result.reason.message : String(result.reason),
      })
    }
  })
}

function parseJsonArray(raw: FormDataEntryValue | null): unknown[] {
  if (!raw || typeof raw !== 'string') return []
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function formToInput(fd: FormData) {
  const yearRaw = fd.get('year')
  const yearNumber = typeof yearRaw === 'string' ? Number(yearRaw) : Number(yearRaw ?? 0)
  return paperInputSchema.parse({
    title: String(fd.get('title') ?? ''),
    subtitle: (fd.get('subtitle') as string) || null,
    abstract: String(fd.get('abstract') ?? ''),
    year: yearNumber,
    publicationDate: toIsoOrNull(fd.get('publicationDate')),
    language: String(fd.get('language') || 'en'),
    degreeLevel: (String(fd.get('degreeLevel') || 'undergraduate')) as 'undergraduate',
    documentType: (String(fd.get('documentType') || 'thesis')) as 'thesis',
    departmentSlug: String(fd.get('departmentSlug') ?? ''),
    doi: normalizeDoi(fd.get('doi')),
    authors: parseJsonArray(fd.get('authors')) as { name: string; email?: string | null; orcid?: string | null }[],
    advisors: parseJsonArray(fd.get('advisors')) as { name: string; email?: string | null; role?: string | null }[],
    keywords: parseJsonArray(fd.get('keywords')) as string[],
    license: (fd.get('license') as string) || null,
    embargoUntil: toIsoOrNull(fd.get('embargoUntil')),
  })
}

function toIsoOrNull(v: FormDataEntryValue | null): string | null {
  if (!v || typeof v !== 'string' || !v.trim()) return null
  const d = new Date(v)
  if (Number.isNaN(d.valueOf())) return null
  return d.toISOString()
}

function normalizeDoi(v: FormDataEntryValue | null): string | null {
  if (!v || typeof v !== 'string') return null
  const trimmed = v.trim()
  if (!trimmed) return null
  return trimmed.replace(/^https?:\/\/(?:dx\.)?doi\.org\//i, '')
}

async function savePdfIfPresent(fd: FormData, existing?: string | null) {
  const pdf = fd.get('pdf')
  if (!(pdf instanceof File) || pdf.size === 0) {
    return { pdfPath: existing ?? null, pdfSize: null as number | null, uploaded: false }
  }
  if (pdf.size > PDF_MAX_BYTES) throw new UploadError('PDF exceeds 25 MB.')
  const bytes = Buffer.from(await pdf.arrayBuffer())
  assertPdf(bytes, pdf.type)
  const key = generatePdfKey()
  const stored = await storage().put(key, bytes, 'application/pdf')
  return { pdfPath: stored.key, pdfSize: stored.size, uploaded: true }
}

async function saveCoverIfPresent(fd: FormData, existing?: string | null) {
  const cover = fd.get('cover')
  if (!(cover instanceof File) || cover.size === 0) {
    return { coverPath: existing ?? null, uploaded: false }
  }
  if (cover.size > IMAGE_MAX_BYTES) throw new UploadError('Cover exceeds 4 MB.')
  const bytes = Buffer.from(await cover.arrayBuffer())
  assertImage(bytes, cover.type)
  const key = generateCoverKey(cover.type)
  const stored = await storage().put(key, bytes, cover.type)
  return { coverPath: stored.key, uploaded: true }
}

export async function submitPaper(fd: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canSubmit(session.user.role)) {
    return { ok: false, error: 'Not authorized.' }
  }

  let newPdfPath: string | null = null
  let newCoverPath: string | null = null

  try {
    const input = formToInput(fd)
    const department = await db.department.findUnique({ where: { slug: input.departmentSlug } })
    if (!department) return { ok: false, error: 'Unknown department.' }

    const slug = await ensureUniquePaperSlug(input.title)
    const { pdfPath, pdfSize, uploaded } = await savePdfIfPresent(fd)
    if (!pdfPath) return { ok: false, error: 'PDF file is required.' }
    const { coverPath, uploaded: coverUploaded } = await saveCoverIfPresent(fd)
    newPdfPath = uploaded ? pdfPath : null
    newCoverPath = coverUploaded ? coverPath : null

    const authorLinks = await connectAuthors(input.authors)
    const advisorLinks = await connectAdvisors(input.advisors)
    const keywordLinks = await connectKeywords(input.keywords)

    const initialStatus = canEdit(session.user.role) ? 'approved' : 'submitted'

    const paper = await db.$transaction(async (tx) => {
      const created = await tx.paper.create({
        data: {
          slug,
          title: input.title,
          subtitle: input.subtitle,
          abstract: input.abstract,
          year: input.year,
          publicationDate: input.publicationDate ? new Date(input.publicationDate) : null,
          language: input.language,
          degreeLevel: input.degreeLevel,
          documentType: input.documentType,
          doi: input.doi,
          license: input.license,
          embargoUntil: input.embargoUntil ? new Date(input.embargoUntil) : null,
          departmentId: department.id,
          submittedById: session.user.id,
          pdfPath,
          pdfSize,
          coverPath,
          status: initialStatus,
          authors: { create: authorLinks },
          advisors: { create: advisorLinks },
          keywords: { create: keywordLinks },
          activity: {
            create: [
              { userId: session.user.id, action: 'created' },
              { userId: session.user.id, action: initialStatus },
            ],
          },
        },
      })
      await tx.file.create({
        data: {
          paperId: created.id,
          kind: 'pdf',
          path: pdfPath,
          mimeType: 'application/pdf',
          size: pdfSize ?? 0,
        },
      })
      return created
    })

    revalidatePath('/')
    revalidatePath('/browse')
    revalidatePath('/admin/papers')
    logger.info('paper submitted', { id: paper.id, status: initialStatus, by: session.user.id })
    return {
      ok: true,
      id: paper.id,
      redirectTo: canEdit(session.user.role) ? `/admin/papers/${paper.id}` : '/submit/thanks',
    }
  } catch (err) {
    await removeStoredKeys([newPdfPath, newCoverPath])
    if (err instanceof UploadError) return { ok: false, error: err.message }
    if (err instanceof ZodError) return { ok: false, error: formatZodError(err) }
    logger.error('submitPaper failed', { err: (err as Error).message })
    return { ok: false, error: 'Failed to submit. Please check your inputs and try again.' }
  }
}

function formatZodError(err: ZodError): string {
  const issue = err.issues[0]
  if (!issue) return 'Please check the form and try again.'
  const field = issue.path.join('.') || 'form'
  return `${field}: ${issue.message}`
}

export async function updatePaper(id: string, fd: FormData): Promise<ActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canEdit(session.user.role)) {
    return { ok: false, error: 'Not authorized.' }
  }

  let newPdfPath: string | null = null
  let newCoverPath: string | null = null

  try {
    const input = formToInput(fd)
    const existing = await db.paper.findUnique({ where: { id } })
    if (!existing) return { ok: false, error: 'Paper not found.' }

    const department = await db.department.findUnique({ where: { slug: input.departmentSlug } })
    if (!department) return { ok: false, error: 'Unknown department.' }

    const { pdfPath, pdfSize, uploaded } = await savePdfIfPresent(fd, existing.pdfPath)
    const { coverPath, uploaded: coverUploaded } = await saveCoverIfPresent(fd, existing.coverPath)
    newPdfPath = uploaded ? pdfPath : null
    newCoverPath = coverUploaded ? coverPath : null

    const newSlug =
      existing.title !== input.title ? await ensureUniquePaperSlug(input.title, id) : existing.slug

    const authorLinks = await connectAuthors(input.authors)
    const advisorLinks = await connectAdvisors(input.advisors)
    const keywordLinks = await connectKeywords(input.keywords)

    const tx: Prisma.PrismaPromise<unknown>[] = [
      db.paperAuthor.deleteMany({ where: { paperId: id } }),
      db.paperAdvisor.deleteMany({ where: { paperId: id } }),
      db.paperKeyword.deleteMany({ where: { paperId: id } }),
      db.paper.update({
        where: { id },
        data: {
          slug: newSlug,
          title: input.title,
          subtitle: input.subtitle,
          abstract: input.abstract,
          year: input.year,
          publicationDate: input.publicationDate ? new Date(input.publicationDate) : null,
          language: input.language,
          degreeLevel: input.degreeLevel,
          documentType: input.documentType,
          doi: input.doi,
          license: input.license,
          embargoUntil: input.embargoUntil ? new Date(input.embargoUntil) : null,
          departmentId: department.id,
          pdfPath,
          pdfSize: pdfSize ?? existing.pdfSize,
          coverPath,
          authors: { create: authorLinks },
          advisors: { create: advisorLinks },
          keywords: { create: keywordLinks },
          activity: { create: [{ userId: session.user.id, action: 'updated' }] },
        },
      }),
    ]

    if (uploaded && pdfPath) {
      tx.push(
        db.file.deleteMany({ where: { paperId: id, kind: 'pdf' } }),
        db.file.create({
          data: {
            paperId: id,
            kind: 'pdf',
            path: pdfPath,
            mimeType: 'application/pdf',
            size: pdfSize ?? existing.pdfSize ?? 0,
          },
        }),
      )
    }

    await db.$transaction(tx)
    await removeStoredKeys([
      uploaded && existing.pdfPath && existing.pdfPath !== pdfPath ? existing.pdfPath : null,
      coverUploaded && existing.coverPath && existing.coverPath !== coverPath ? existing.coverPath : null,
    ])

    revalidatePath('/admin/papers')
    revalidatePath(`/papers/${newSlug}`)
    if (existing.slug !== newSlug) revalidatePath(`/papers/${existing.slug}`)
    logger.info('paper updated', { id, by: session.user.id })
    return { ok: true, id, redirectTo: `/admin/papers/${id}` }
  } catch (err) {
    await removeStoredKeys([newPdfPath, newCoverPath])
    if (err instanceof UploadError) return { ok: false, error: err.message }
    if (err instanceof ZodError) return { ok: false, error: formatZodError(err) }
    logger.error('updatePaper failed', { err: (err as Error).message, id })
    return { ok: false, error: 'Update failed.' }
  }
}

export async function setPaperStatus(id: string, status: string, note?: string): Promise<ActionResult> {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canPublish(session.user.role)) {
    return { ok: false, error: 'Not authorized.' }
  }

  if (!paperStatuses.includes(status as (typeof paperStatuses)[number])) {
    return { ok: false, error: 'Invalid status.' }
  }

  const existing = await db.paper.findUnique({
    where: { id },
    select: { status: true, publishedAt: true, slug: true },
  })
  if (!existing) return { ok: false, error: 'Paper not found.' }

  if (!canTransition(existing.status, status)) {
    return {
      ok: false,
      error: `Cannot move a paper from ${existing.status} to ${status}.`,
    }
  }

  const data = buildStatusTransitionData(existing.status, existing.publishedAt, status)
  const trimmedNote = note?.trim() || null

  await db.$transaction([
    db.paper.update({ where: { id }, data }),
    db.activityLog.create({
      data: {
        paperId: id,
        userId: session.user.id,
        action: `status:${status}`,
        detail: trimmedNote ? { note: trimmedNote } : undefined,
      },
    }),
  ])

  revalidatePath('/admin/papers')
  revalidatePath('/')
  revalidatePath(`/papers/${existing.slug}`)
  logger.info('paper status changed', {
    id,
    from: existing.status,
    to: status,
    by: session.user.id,
  })
  return { ok: true, id, redirectTo: `/admin/papers/${id}` }
}
