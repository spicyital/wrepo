import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { db } from '@/lib/db'
import { storage } from '@/lib/storage'
import { Badge } from '@/components/ui/Badge'
import { PdfPreview } from '@/components/PdfPreview'
import { CitationBlock } from '@/components/CitationBlock'
import { PaperCard } from '@/components/PaperCard'
import { JsonLd } from '@/components/JsonLd'
import { absoluteUrl, doiUrl, formatDate, truncate } from '@/lib/utils'
import { getRelatedPapers } from '@/lib/papers/related'

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const paper = await db.paper.findFirst({
    where: { slug: params.slug, status: 'published', deletedAt: null },
    include: { authors: { include: { author: true } } },
  })
  if (!paper) return { title: 'Not found' }
  const description = truncate(paper.abstract, 200)
  const coverImage = paper.coverPath && (!paper.embargoUntil || paper.embargoUntil <= new Date())
    ? [`${absoluteUrl(`/api/files/${encodeURI(paper.coverPath)}`)}`]
    : undefined
  return {
    title: paper.title,
    description,
    alternates: { canonical: `/papers/${paper.slug}` },
    openGraph: {
      type: 'article',
      title: paper.title,
      description,
      url: absoluteUrl(`/papers/${paper.slug}`),
      authors: paper.authors.map((a) => a.author.name),
      publishedTime: (paper.publicationDate ?? paper.publishedAt)?.toISOString(),
      images: coverImage,
    },
  }
}

export default async function PaperPage({ params }: { params: { slug: string } }) {
  const paper = await db.paper.findFirst({
    where: { slug: params.slug, status: 'published', deletedAt: null },
    include: {
      department: true,
      authors: { include: { author: true }, orderBy: { position: 'asc' } },
      advisors: { include: { advisor: true } },
      keywords: { include: { keyword: true } },
    },
  })
  if (!paper) notFound()

  const pdfUrl = paper.pdfPath ? storage().url(paper.pdfPath) : null
  const embargoed = paper.embargoUntil && paper.embargoUntil > new Date()
  const canonical = absoluteUrl(`/papers/${paper.slug}`)
  const publicationDate = paper.publicationDate ?? paper.publishedAt ?? paper.updatedAt
  const doiHref = doiUrl(paper.doi)
  const publicPdfUrl = pdfUrl && !embargoed ? pdfUrl : null

  const related = await getRelatedPapers(paper.id, 4)

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ScholarlyArticle',
    headline: paper.title,
    abstract: paper.abstract,
    author: paper.authors.map((a) => ({ '@type': 'Person', name: a.author.name })),
    datePublished: publicationDate.toISOString(),
    dateModified: paper.updatedAt.toISOString(),
    inLanguage: paper.language,
    keywords: paper.keywords.map((k) => k.keyword.term),
    url: canonical,
    identifier: paper.doi ? { '@type': 'PropertyValue', propertyID: 'DOI', value: paper.doi } : undefined,
    sameAs: doiHref ?? undefined,
    isAccessibleForFree: !embargoed,
    encoding: publicPdfUrl
      ? { '@type': 'MediaObject', encodingFormat: 'application/pdf', contentUrl: absoluteUrl(publicPdfUrl) }
      : undefined,
    isPartOf: paper.department ? { '@type': 'Periodical', name: paper.department.name } : undefined,
  }

  return (
    <article className="mx-auto max-w-4xl px-6 py-16">
      <JsonLd data={jsonLd} />

      <div className="flex flex-wrap items-center gap-2 text-xs text-ink-500">
        {paper.department && (
          <Link href={`/browse/department/${paper.department.slug}`} className="no-underline hover:text-ink-800">
            {paper.department.name}
          </Link>
        )}
        <span className="text-ink-300">·</span>
        <span>{paper.year}</span>
        <span className="text-ink-300">·</span>
        <Badge tone="neutral" className="capitalize">{paper.documentType.replaceAll('_', ' ')}</Badge>
        {embargoed && <Badge tone="warn">Embargoed until {formatDate(paper.embargoUntil)}</Badge>}
      </div>

      <h1 className="mt-4 font-serif text-4xl leading-tight text-ink-900 md:text-5xl">{paper.title}</h1>
      {paper.subtitle && <p className="mt-2 font-serif text-2xl text-ink-600">{paper.subtitle}</p>}

      <div className="mt-4 text-ink-700">
        {paper.authors.map((a, i) => (
          <span key={a.author.id}>
            <Link href={`/browse/author/${a.author.slug}`} className="no-underline hover:text-accent-700">
              {a.author.name}
            </Link>
            {i < paper.authors.length - 1 && <span className="text-ink-400">, </span>}
          </span>
        ))}
      </div>

      {paper.advisors.length > 0 && (
        <p className="mt-1 text-sm text-ink-500">
          Advised by{' '}
          {paper.advisors.map((a, i) => (
            <span key={a.advisor.id}>
              <Link href={`/browse/advisor/${a.advisor.slug}`} className="no-underline hover:text-accent-700">
                {a.advisor.name}
              </Link>
              {i < paper.advisors.length - 1 && ', '}
            </span>
          ))}
        </p>
      )}

      <section className="mt-10">
        <h2 className="text-xs uppercase tracking-widest text-ink-500">Abstract</h2>
        <p className="prose-serif mt-3 max-w-prose whitespace-pre-line text-lg leading-relaxed text-ink-800">
          {paper.abstract}
        </p>
      </section>

      <dl className="mt-10 grid gap-x-8 gap-y-4 border-y border-ink-100 py-6 text-sm md:grid-cols-2">
        <Meta label="Publication date" value={formatDate(publicationDate)} />
        <Meta label="Language" value={paper.language.toUpperCase()} />
        <Meta label="Degree level" value={<span className="capitalize">{paper.degreeLevel}</span>} />
        <Meta label="License" value={paper.license ?? 'All rights reserved'} />
        {paper.doi && (
          <Meta
            label="DOI"
            value={
              doiHref ? (
                <a href={doiHref} className="text-accent-700 hover:text-accent-800">
                  {paper.doi}
                </a>
              ) : (
                paper.doi
              )
            }
          />
        )}
      </dl>

      {paper.keywords.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {paper.keywords.map((k) => (
            <Link
              key={k.keywordId}
              href={`/browse/keyword/${k.keyword.slug}`}
              className="rounded-full bg-ink-50 px-3 py-1 text-xs text-ink-700 no-underline hover:bg-ink-100"
            >
              #{k.keyword.term}
            </Link>
          ))}
        </div>
      )}

      <section className="mt-12">
        <div className="flex items-center justify-between">
          <h2 className="text-xs uppercase tracking-widest text-ink-500">PDF</h2>
          {pdfUrl && !embargoed && (
            <a
              href={pdfUrl}
              download
              className="rounded-md bg-ink-900 px-4 py-2 text-sm text-white no-underline hover:bg-ink-800"
            >
              Download
            </a>
          )}
        </div>
        <div className="mt-3">
          {embargoed ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
              This work is under embargo until <strong>{formatDate(paper.embargoUntil)}</strong>. Metadata is
              public; the file will be released automatically.
            </div>
          ) : pdfUrl ? (
            <PdfPreview src={pdfUrl} title={paper.title} />
          ) : (
            <p className="text-sm text-ink-500">No PDF attached.</p>
          )}
        </div>
      </section>

      <section className="mt-12">
        <h2 className="text-xs uppercase tracking-widest text-ink-500">Cite</h2>
        <div className="mt-3">
          <CitationBlock
            authors={paper.authors.map((a) => ({ name: a.author.name }))}
            year={paper.year}
            title={paper.title}
            department={paper.department?.name}
            url={canonical}
            doi={paper.doi}
          />
        </div>
      </section>

      {related.length > 0 && (
        <section className="mt-12 border-t border-ink-100 pt-8">
          <h2 className="mb-2 font-serif text-xl text-ink-900">Related papers</h2>
          {related.map((p) => (
            <PaperCard
              key={p.id}
              slug={p.slug}
              title={p.title}
              abstract={p.abstract}
              year={p.year}
              authors={p.authors.map((a) => ({ name: a.author.name }))}
              department={p.department}
              documentType={p.documentType}
            />
          ))}
        </section>
      )}
    </article>
  )
}

function Meta({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-widest text-ink-500">{label}</dt>
      <dd className="mt-0.5 text-ink-800">{value}</dd>
    </div>
  )
}
