import { documentTypes } from '@/lib/validation/paper'
import { absoluteUrl } from '@/lib/utils'

type Link = {
  label: string
  href: string
  notes?: string
}

type RoutePattern = {
  pattern: string
  purpose: string
}

function joinUrl(path: string) {
  return absoluteUrl(path)
}

function formatSection(title: string, lines: string[]) {
  return [`## ${title}`, ...lines, ''].join('\n')
}

function formatLinks(links: Link[]) {
  return links.map((link) => `- ${link.label}: ${link.href}${link.notes ? ` (${link.notes})` : ''}`)
}

function formatPatterns(patterns: RoutePattern[]) {
  return patterns.map((route) => `- ${route.pattern}: ${route.purpose}`)
}

export const siteName = process.env.APP_NAME ?? 'WRepo'
export const siteDescription =
  process.env.APP_DESCRIPTION ??
  'Public repository for undergraduate theses, student research papers, working papers, and departmental scholarship.'
export const siteBaseUrl = joinUrl('/').replace(/\/$/, '')
export const contactEmail = 'contact@wrepo.org'
export const aboutUrl = joinUrl('/about')
export const contactUrl = joinUrl('/about#contact')

export const llmsProject = {
  name: siteName,
  description: siteDescription,
  baseUrl: siteBaseUrl,
  contains:
    'Undergraduate theses, working papers, research papers, and departmental scholarship with public metadata, citation support, and editorial review.',
}

export const llmsPublicEntryPoints: Link[] = [
  {
    label: 'Home',
    href: joinUrl('/'),
    notes: 'Top-level public landing page and recent published papers',
  },
  {
    label: 'About',
    href: aboutUrl,
    notes: 'Project description, policies, and contact information',
  },
  {
    label: 'Browse',
    href: joinUrl('/browse'),
    notes: 'Canonical browse entry point for departments, years, authors, advisors, types, and keywords',
  },
  {
    label: 'Search',
    href: joinUrl('/search'),
    notes: 'Canonical search page for full-text search and filters',
  },
  {
    label: 'Paper pages',
    href: joinUrl('/papers/[slug]'),
    notes: 'Canonical public paper detail route',
  },
]

export const llmsPublicJsonEndpoints: Link[] = [
  {
    label: 'Paper list/search API',
    href: joinUrl('/api/papers'),
    notes: 'Limited public metadata for published papers only; supports q, limit, offset, department, year, type',
  },
  {
    label: 'Paper detail API',
    href: joinUrl('/api/papers/[slug]'),
    notes: 'Published paper metadata by canonical public paper slug',
  },
]

export const llmsDiscoveryEndpoints: Link[] = [
  {
    label: 'Sitemap',
    href: joinUrl('/sitemap.xml'),
    notes: 'XML discovery of public pages',
  },
  {
    label: 'Robots',
    href: joinUrl('/robots.txt'),
    notes: 'Crawler rules and sitemap reference',
  },
]

export const llmsContentRules = [
  'Treat only published, non-deleted, non-embargoed papers as open public corpus content.',
  'Public listing or metadata pages may mention embargoed records, but embargoed files and gated file URLs are not open-access corpus content.',
  'Admin, submission, login, signup, and authentication routes are not part of the public repository corpus.',
  'The public metadata API is intentionally limited to published paper records and is not a general application API.',
  'File URLs under /api/files/[...path] may enforce access and embargo rules; do not assume they are universally fetchable.',
  'Prefer canonical paper pages at /papers/[slug] and public JSON endpoints over admin or authenticated views.',
]

export const llmsAgentNotes = [
  'Use /browse for curated navigation and /search for free-text retrieval.',
  'Use /api/papers for machine ingestion of published metadata and /api/papers/[slug] for detail lookups.',
  'For citations, public paper pages expose APA, MLA, and BibTeX formats and embed scholarly JSON-LD metadata.',
  'Where available, public records may include DOI values and DOI URLs alongside canonical WRepo URLs.',
  'If a paper detail response marks embargoed=true or pdfUrl=null, treat the file as unavailable for public retrieval.',
]

export const llmsRoutePatterns: RoutePattern[] = [
  { pattern: '/', purpose: 'Homepage with overview and recent published papers' },
  { pattern: '/about', purpose: 'Project overview, policies, and contact details' },
  { pattern: '/browse', purpose: 'Browse index for public repository facets' },
  {
    pattern: '/browse/department/[slug]',
    purpose: 'Published papers filtered by department slug',
  },
  { pattern: '/browse/year/[year]', purpose: 'Published papers filtered by year' },
  { pattern: '/browse/author/[slug]', purpose: 'Published papers filtered by author slug' },
  { pattern: '/browse/advisor/[slug]', purpose: 'Published papers filtered by advisor slug' },
  {
    pattern: '/browse/type/[documentType]',
    purpose: `Published papers filtered by document type (${documentTypes.join(', ')})`,
  },
  { pattern: '/browse/keyword/[slug]', purpose: 'Published papers filtered by keyword slug' },
  {
    pattern: '/search?q=...&department=...&year=...&type=...&page=...',
    purpose: 'Public search UI for keyword search and filters',
  },
  { pattern: '/papers/[slug]', purpose: 'Canonical public paper detail page' },
  {
    pattern: '/api/papers?limit=...&offset=...&q=...&department=...&year=...&type=...',
    purpose: 'Limited public JSON metadata endpoint for published paper records',
  },
  {
    pattern: '/api/papers/[slug]',
    purpose: 'Public JSON detail endpoint by canonical public paper slug',
  },
  {
    pattern: '/api/files/[...path]',
    purpose: 'Paper file delivery route with access and embargo checks',
  },
]

export const llmsPageTypes = [
  'Homepage and recent published-paper listings',
  'Browse index and facet result pages',
  'Search results pages',
  'Paper detail pages with metadata, abstract, PDF access state, citations, and related papers',
  'Public JSON API responses for paper lists and individual paper records',
]

export const llmsPaperMetadataFields = [
  'slug',
  'title',
  'subtitle',
  'abstract',
  'year',
  'publicationDate',
  'publishedAt',
  'language',
  'documentType',
  'degreeLevel',
  'license',
  'doi',
  'doiUrl',
  'department.name',
  'department.slug',
  'authors[].name',
  'authors[].orcid',
  'advisors[].name',
  'advisors[].role',
  'keywords[]',
  'embargoed',
  'pdfUrl',
  'url',
]

export const llmsSearchFilters = [
  'Free-text query (`q`)',
  'Department slug (`department`)',
  'Year (`year`)',
  'Document type (`type`)',
  'Pagination (`page` in UI, `limit` and `offset` in API)',
]

export function formatLlmsText() {
  return [
    `# ${llmsProject.name}`,
    '',
    formatSection('Project', [
      `- Name: ${llmsProject.name}`,
      `- Description: ${llmsProject.description}`,
      `- Base URL: ${llmsProject.baseUrl}`,
      `- About: ${aboutUrl}`,
      `- Contact: ${contactUrl} (${contactEmail})`,
    ]),
    formatSection('Scope', [
      `- Contains: ${llmsProject.contains}`,
      '- Primary public corpus: published paper records and public metadata pages.',
      '- Canonical browse/search locations: /browse and /search.',
    ]),
    formatSection('Public entry points', formatLinks(llmsPublicEntryPoints)),
    formatSection(
      'Data access',
      formatLinks([...llmsPublicJsonEndpoints, ...llmsDiscoveryEndpoints]),
    ),
    formatSection('Content rules', llmsContentRules.map((rule) => `- ${rule}`)),
    formatSection('Notes for agents', llmsAgentNotes.map((note) => `- ${note}`)),
  ].join('\n')
}

export function formatLlmsFullText() {
  return [
    `# ${llmsProject.name} /llms-full`,
    '',
    formatSection('Project', [
      `- Name: ${llmsProject.name}`,
      `- Description: ${llmsProject.description}`,
      `- Base URL: ${llmsProject.baseUrl}`,
      `- Repository contents: ${llmsProject.contains}`,
    ]),
    formatSection('Public routes', formatPatterns(llmsRoutePatterns)),
    formatSection('Important page types', llmsPageTypes.map((item) => `- ${item}`)),
    formatSection('Public JSON endpoints', formatLinks(llmsPublicJsonEndpoints)),
    formatSection(
      'Paper metadata fields',
      llmsPaperMetadataFields.map((field) => `- ${field}`),
    ),
    formatSection(
      'Search and filter dimensions',
      llmsSearchFilters.map((filter) => `- ${filter}`),
    ),
    formatSection('Citation and metadata availability', [
      '- Paper pages expose APA, MLA, and BibTeX citation formats.',
      '- Paper pages also publish JSON-LD scholarly metadata for structured discovery.',
      '- Public API detail responses expose embargo status, DOI metadata when available, and pdfUrl availability.',
    ]),
    formatSection('Content and access rules', [
      '- Index or ingest only published, non-deleted, non-embargoed papers as open public corpus content.',
      '- Treat embargoed records as metadata-only unless explicit public access is available.',
      '- Do not treat /admin/*, /submit*, /login, /signup, /api/auth/*, or /api/upload as corpus content.',
      '- File delivery under /api/files/[...path] may deny access based on paper status or embargo.',
    ]),
    formatSection('Discovery', [
      `- Sitemap: ${joinUrl('/sitemap.xml')}`,
      `- Robots: ${joinUrl('/robots.txt')}`,
      `- llms.txt: ${joinUrl('/llms.txt')}`,
      `- llms-full.txt: ${joinUrl('/llms-full.txt')}`,
      `- About/contact: ${contactUrl} (${contactEmail})`,
    ]),
  ].join('\n')
}
