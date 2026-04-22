import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { slugify, uniqueSlug } from '@/lib/slug'
import type { PaperInput } from '@/lib/validation/paper'

export async function ensureUniquePaperSlug(title: string, skipId?: string): Promise<string> {
  const base = slugify(title) || 'paper'
  const existing = await db.paper.findMany({
    where: { slug: { startsWith: base }, ...(skipId ? { NOT: { id: skipId } } : {}) },
    select: { slug: true },
  })
  return uniqueSlug(base, existing.map((e) => e.slug))
}

async function uniquePersonSlug(
  kind: 'author' | 'advisor' | 'keyword',
  base: string,
): Promise<string> {
  const b = slugify(base) || kind
  const rows =
    kind === 'author'
      ? await db.author.findMany({ where: { slug: { startsWith: b } }, select: { slug: true } })
      : kind === 'advisor'
      ? await db.advisor.findMany({ where: { slug: { startsWith: b } }, select: { slug: true } })
      : await db.keyword.findMany({ where: { slug: { startsWith: b } }, select: { slug: true } })
  return uniqueSlug(b, rows.map((r) => r.slug))
}

export async function connectAuthors(
  authors: PaperInput['authors'],
): Promise<{ authorId: string; position: number }[]> {
  const out: { authorId: string; position: number }[] = []
  for (let i = 0; i < authors.length; i++) {
    const a = authors[i]
    const match = a.email
      ? await db.author.findFirst({ where: { email: a.email } })
      : await db.author.findFirst({ where: { name: a.name, email: null } })
    const record =
      match ??
      (await db.author.create({
        data: {
          name: a.name,
          email: a.email || null,
          orcid: a.orcid || null,
          slug: await uniquePersonSlug('author', a.name),
        },
      }))
    out.push({ authorId: record.id, position: i })
  }
  return out
}

export async function connectAdvisors(
  advisors: PaperInput['advisors'],
): Promise<{ advisorId: string; role: string | null }[]> {
  const out: { advisorId: string; role: string | null }[] = []
  for (const a of advisors) {
    const match = a.email
      ? await db.advisor.findFirst({ where: { email: a.email } })
      : await db.advisor.findFirst({ where: { name: a.name, email: null } })
    const record =
      match ??
      (await db.advisor.create({
        data: {
          name: a.name,
          email: a.email || null,
          slug: await uniquePersonSlug('advisor', a.name),
        },
      }))
    out.push({ advisorId: record.id, role: a.role || null })
  }
  return out
}

export async function connectKeywords(terms: string[]): Promise<{ keywordId: string }[]> {
  const out: { keywordId: string }[] = []
  const seen = new Set<string>()
  for (const term of terms) {
    const normalized = term.trim().toLowerCase()
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    const record =
      (await db.keyword.findUnique({ where: { term: normalized } })) ??
      (await db.keyword.create({
        data: {
          term: normalized,
          slug: await uniquePersonSlug('keyword', normalized),
        },
      }))
    out.push({ keywordId: record.id })
  }
  return out
}

/** Allowed manual status transitions. Mirrors the editorial lifecycle. */
const transitions: Record<string, ReadonlySet<string>> = {
  draft:     new Set(['submitted', 'archived']),
  submitted: new Set(['approved', 'rejected', 'archived', 'draft']),
  approved:  new Set(['published', 'rejected', 'archived', 'submitted']),
  rejected:  new Set(['submitted', 'archived', 'draft']),
  published: new Set(['approved', 'archived']),
  archived:  new Set(['approved', 'draft']),
}

export function canTransition(from: string, to: string): boolean {
  if (from === to) return true
  return transitions[from]?.has(to) ?? false
}

export function buildStatusTransitionData(
  currentStatus: string,
  currentPublishedAt: Date | null,
  next: string,
): Prisma.PaperUpdateInput {
  const data: Prisma.PaperUpdateInput = { status: next as Prisma.PaperUpdateInput['status'] }

  if (next === 'published' && !currentPublishedAt) {
    data.publishedAt = new Date()
  }
  if (next === 'archived') {
    data.deletedAt = new Date()
  } else if (currentStatus === 'archived') {
    data.deletedAt = null
  }
  return data
}
