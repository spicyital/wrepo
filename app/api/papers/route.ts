import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { search } from '@/lib/search'
import { logger } from '@/lib/logger'
import { documentTypes } from '@/lib/validation/paper'
import { absoluteUrl, doiUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

/**
 * Limited public metadata endpoint for published paper records.
 * It is intentionally read-only and excludes drafts, rejected papers, archived
 * records, unpublished files, and internal admin data.
 */
export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url)
    const q = (url.searchParams.get('q') ?? '').trim()
    const limit = clamp(Number(url.searchParams.get('limit') ?? '20'), 1, 100)
    const offset = clamp(Number(url.searchParams.get('offset') ?? '0'), 0, 10_000)
    const departmentSlug = url.searchParams.get('department') ?? undefined
    const yearRaw = url.searchParams.get('year')
    const year = yearRaw ? Number(yearRaw) : undefined
    if (year !== undefined && !Number.isInteger(year)) {
      return NextResponse.json({ error: 'invalid year' }, { status: 400 })
    }
    const documentType = url.searchParams.get('type') ?? undefined
    if (documentType && !documentTypes.includes(documentType as (typeof documentTypes)[number])) {
      return NextResponse.json({ error: 'invalid type' }, { status: 400 })
    }
    const validDocumentType = documentType as (typeof documentTypes)[number] | undefined

    if (q.length > 0) {
      const { hits, total } = await search().query({
        q,
        limit,
        offset,
        filters: { departmentSlug, year, documentType: validDocumentType },
      })
      const hitIds = hits.map((hit) => hit.id)
      const papers = hitIds.length
        ? await db.paper.findMany({
            where: { id: { in: hitIds }, status: 'published', deletedAt: null },
            include: { authors: { include: { author: true } }, department: true },
          })
        : []
      const byId = new Map(papers.map((paper) => [paper.id, paper]))
      return NextResponse.json({
        total,
        limit,
        offset,
        hits: hits
          .map((hit) => byId.get(hit.id))
          .filter((paper): paper is (typeof papers)[number] => !!paper)
          .map((paper) => toPublicListHit(paper)),
      })
    }

    const where: Prisma.PaperWhereInput = {
      status: 'published' as const,
      deletedAt: null,
      ...(departmentSlug ? { department: { slug: departmentSlug } } : {}),
      ...(year ? { year } : {}),
      ...(validDocumentType ? { documentType: validDocumentType } : {}),
    }

    const [papers, total] = await Promise.all([
      db.paper.findMany({
        where,
        orderBy: { publishedAt: 'desc' },
        take: limit,
        skip: offset,
        include: { authors: { include: { author: true } }, department: true },
      }),
      db.paper.count({ where }),
    ])

    return NextResponse.json({
      total,
      limit,
      offset,
      hits: papers.map((paper) => toPublicListHit(paper)),
    })
  } catch (err) {
    logger.error('GET /api/papers failed', { err: (err as Error).message })
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

function toPublicListHit(
  paper: Prisma.PaperGetPayload<{ include: { authors: { include: { author: true } }; department: true } }>,
) {
  const embargoed = !!paper.embargoUntil && paper.embargoUntil > new Date()
  return {
    slug: paper.slug,
    title: paper.title,
    subtitle: paper.subtitle,
    year: paper.year,
    abstract: paper.abstract,
    url: absoluteUrl(`/papers/${paper.slug}`),
    department: paper.department?.name ?? null,
    departmentSlug: paper.department?.slug ?? null,
    authors: paper.authors.map((author) => author.author.name),
    publicationDate: paper.publicationDate,
    publishedAt: paper.publishedAt,
    language: paper.language,
    documentType: paper.documentType,
    license: paper.license,
    doi: paper.doi,
    doiUrl: doiUrl(paper.doi),
    embargoed,
    pdfUrl: embargoed || !paper.pdfPath ? null : `/api/files/${encodeURI(paper.pdfPath)}`,
  }
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}
