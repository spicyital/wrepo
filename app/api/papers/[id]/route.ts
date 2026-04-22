import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { absoluteUrl, doiUrl } from '@/lib/utils'

/**
 * Public paper detail by canonical slug. Only returns published, non-deleted
 * papers. The returned PDF URL is still subject to access checks in
 * /api/files/[...path].
 */
export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const key = params.id
  const paper = await db.paper.findFirst({
    where: {
      slug: key,
      status: 'published',
      deletedAt: null,
    },
    include: {
      authors: { include: { author: true }, orderBy: { position: 'asc' } },
      advisors: { include: { advisor: true } },
      keywords: { include: { keyword: true } },
      department: true,
    },
  })
  if (!paper) return NextResponse.json({ error: 'not found' }, { status: 404 })

  const embargoed = !!paper.embargoUntil && paper.embargoUntil > new Date()

  return NextResponse.json({
    slug: paper.slug,
    title: paper.title,
    subtitle: paper.subtitle,
    abstract: paper.abstract,
    year: paper.year,
    publicationDate: paper.publicationDate,
    language: paper.language,
    documentType: paper.documentType,
    degreeLevel: paper.degreeLevel,
    license: paper.license,
    doi: paper.doi,
    doiUrl: doiUrl(paper.doi),
    url: absoluteUrl(`/papers/${paper.slug}`),
    department: paper.department ? { name: paper.department.name, slug: paper.department.slug } : null,
    authors: paper.authors.map((a) => ({ name: a.author.name, orcid: a.author.orcid })),
    advisors: paper.advisors.map((a) => ({ name: a.advisor.name, role: a.role })),
    keywords: paper.keywords.map((k) => k.keyword.term),
    publishedAt: paper.publishedAt,
    embargoed,
    pdfUrl: embargoed || !paper.pdfPath ? null : `/api/files/${encodeURI(paper.pdfPath)}`,
  })
}
