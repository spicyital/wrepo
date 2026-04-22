import type { MetadataRoute } from 'next'
import { db } from '@/lib/db'
import { absoluteUrl } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [papers, departments] = await Promise.all([
    db.paper.findMany({
      where: { status: 'published', deletedAt: null },
      select: { slug: true, updatedAt: true },
    }),
    db.department.findMany({ select: { slug: true, createdAt: true } }),
  ])

  const now = new Date()
  return [
    { url: absoluteUrl('/'), lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: absoluteUrl('/browse'), lastModified: now, changeFrequency: 'daily', priority: 0.8 },
    { url: absoluteUrl('/search'), lastModified: now, changeFrequency: 'weekly', priority: 0.5 },
    { url: absoluteUrl('/about'), lastModified: now, changeFrequency: 'monthly', priority: 0.3 },
    ...departments.map((d) => ({
      url: absoluteUrl(`/browse/department/${d.slug}`),
      lastModified: d.createdAt,
      changeFrequency: 'weekly' as const,
      priority: 0.6,
    })),
    ...papers.map((p) => ({
      url: absoluteUrl(`/papers/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    })),
  ]
}
