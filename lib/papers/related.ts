import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'

/**
 * Return papers similar to `paperId` ranked by shared keywords, then department.
 * Runs two small queries so we stay under Prisma's comfort zone; good enough for
 * the archive's size and produces meaningfully better ordering than a plain
 * department+publishedAt sort.
 */
export async function getRelatedPapers(paperId: string, limit = 4) {
  const base = await db.paper.findUnique({
    where: { id: paperId },
    select: {
      departmentId: true,
      keywords: { select: { keywordId: true } },
    },
  })
  if (!base) return []

  const keywordIds = base.keywords.map((k) => k.keywordId)
  const orClauses: Prisma.PaperWhereInput[] = []
  if (base.departmentId) orClauses.push({ departmentId: base.departmentId })
  if (keywordIds.length) orClauses.push({ keywords: { some: { keywordId: { in: keywordIds } } } })

  if (orClauses.length === 0) return []

  const candidates = await db.paper.findMany({
    where: {
      id: { not: paperId },
      status: 'published',
      deletedAt: null,
      OR: orClauses,
    },
    orderBy: { publishedAt: 'desc' },
    take: limit * 6,
    include: {
      department: true,
      authors: { include: { author: true }, orderBy: { position: 'asc' } },
      keywords: { select: { keywordId: true } },
    },
  })

  const keywordSet = new Set(keywordIds)
  const scored = candidates.map((c) => {
    const shared = c.keywords.reduce((n, k) => (keywordSet.has(k.keywordId) ? n + 1 : n), 0)
    const sameDept = c.departmentId && c.departmentId === base.departmentId ? 1 : 0
    return { paper: c, score: shared * 3 + sameDept }
  })

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score
    const ap = a.paper.publishedAt?.valueOf() ?? 0
    const bp = b.paper.publishedAt?.valueOf() ?? 0
    return bp - ap
  })

  return scored.slice(0, limit).map((s) => s.paper)
}
