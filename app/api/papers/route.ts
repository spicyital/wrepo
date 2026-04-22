import { NextRequest, NextResponse } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { search } from '@/lib/search'
import { logger } from '@/lib/logger'
import { documentTypes } from '@/lib/validation/paper'

export const dynamic = 'force-dynamic'

/**
 * Read-only JSON endpoint for integrations and future OAI-PMH-style exports.
 * Returns only published, non-deleted papers.
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
      return NextResponse.json({ total, limit, offset, hits })
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
      hits: papers.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        year: p.year,
        abstract: p.abstract,
        department: p.department?.name ?? null,
        authors: p.authors.map((a) => a.author.name),
        publishedAt: p.publishedAt,
      })),
    })
  } catch (err) {
    logger.error('GET /api/papers failed', { err: (err as Error).message })
    return NextResponse.json({ error: 'internal error' }, { status: 500 })
  }
}

function clamp(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min
  return Math.max(min, Math.min(max, n))
}
