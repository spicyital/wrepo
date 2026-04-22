/**
 * Seed a realistic starter dataset: one admin, a few departments,
 * and ~8 published papers with authors, advisors, and keywords.
 *
 * Run with: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { slugify } from '../lib/slug'

const db = new PrismaClient()

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? 'admin@wrepo.org').toLowerCase()
  const adminPassword = process.env.ADMIN_PASSWORD ?? 'change-me-please'
  const adminName = process.env.ADMIN_NAME ?? 'WRepo Administrator'

  const admin = await db.user.upsert({
    where: { email: adminEmail },
    update: {},
    create: {
      email: adminEmail,
      name: adminName,
      passwordHash: await bcrypt.hash(adminPassword, 10),
      role: 'super_admin',
    },
  })
  console.log(`[ok] admin: ${admin.email}`)

  const departments = await Promise.all(
    [
      {
        name: 'School of International Liberal Studies',
        shortCode: 'SILS',
        about: 'Interdisciplinary studies across languages, cultures, and global systems.',
      },
      {
        name: 'Political Science',
        shortCode: 'PS',
        about: 'Governance, political theory, international relations.',
      },
      {
        name: 'Computer Science',
        shortCode: 'CS',
        about: 'Systems, theory, and applied computing.',
      },
      {
        name: 'Economics',
        shortCode: 'ECON',
        about: 'Micro, macro, econometrics, and policy.',
      },
      {
        name: 'Literature',
        shortCode: 'LIT',
        about: 'Comparative literature and literary theory.',
      },
    ].map((d) =>
      db.department.upsert({
        where: { slug: slugify(d.name) },
        update: { about: d.about, shortCode: d.shortCode },
        create: { ...d, slug: slugify(d.name) },
      }),
    ),
  )
  const bySlug = Object.fromEntries(departments.map((d) => [d.slug, d]))

  type SeedPaper = {
    title: string
    subtitle?: string
    abstract: string
    year: number
    department: string
    degreeLevel: 'undergraduate' | 'masters' | 'doctoral' | 'honours' | 'other'
    documentType: 'thesis' | 'research_paper' | 'article' | 'report' | 'working_paper' | 'other'
    authors: { name: string; email?: string; orcid?: string }[]
    advisors: { name: string; role?: string }[]
    keywords: string[]
    license?: string
  }

  const papers: SeedPaper[] = [
    {
      title: 'Between Borders, Between Languages: Code-switching in Tokyo Youth Narratives',
      subtitle: 'A sociolinguistic study of bilingual identity',
      abstract:
        'This thesis examines how bilingual young adults in Tokyo navigate code-switching between Japanese and English as a tool of identity construction. Drawing on 24 semi-structured interviews and a narrative-analysis framework, the study finds that code-switching operates less as a linguistic accident than as a deliberate practice of alignment with interlocutor, topic, and situational stance.',
      year: 2025,
      department: slugify('School of International Liberal Studies'),
      degreeLevel: 'undergraduate',
      documentType: 'thesis',
      authors: [{ name: 'Hana Tanaka', email: 'hana.tanaka@example.edu' }],
      advisors: [{ name: 'Prof. Marcus Linde', role: 'primary' }],
      keywords: ['sociolinguistics', 'bilingualism', 'tokyo', 'identity'],
      license: 'CC-BY-4.0',
    },
    {
      title: 'Quiet Deliberation: Small-Group Decision Making in Municipal Councils',
      abstract:
        'Using transcripts from 312 municipal council meetings, we model how quiet-majority dynamics shape policy outcomes. Contrary to the assumption that vocal majorities drive agenda-setting, the data suggest that silent consensus, often formed during procedural lulls, predicts final votes with surprising accuracy.',
      year: 2024,
      department: slugify('Political Science'),
      degreeLevel: 'honours',
      documentType: 'research_paper',
      authors: [{ name: 'Jonas Weber' }, { name: 'Elena Park' }],
      advisors: [{ name: 'Dr. Aisha Okafor', role: 'primary' }],
      keywords: ['deliberation', 'governance', 'councils', 'decision-making'],
      license: 'CC-BY-4.0',
    },
    {
      title: 'Fast-Enough: Lightweight Full-Text Search for Small Archives',
      abstract:
        'We benchmark PostgreSQL full-text search against Meilisearch and OpenSearch for archives under 50k documents. For operators running small self-hosted repositories, vanilla PostgreSQL FTS is within 10-30% of specialized engines on query latency while halving operational complexity.',
      year: 2025,
      department: slugify('Computer Science'),
      degreeLevel: 'undergraduate',
      documentType: 'working_paper',
      authors: [{ name: 'R. Bertu' }],
      advisors: [{ name: 'Prof. Yamada' }],
      keywords: ['postgres', 'search', 'self-hosting', 'archives'],
      license: 'CC-BY-4.0',
    },
    {
      title: 'Unemployment Duration and Informal Transfers in Southeast Asia',
      abstract:
        'Using panel data from four ASEAN economies, we estimate the effect of informal household transfers on unemployment duration. Informal transfers shorten duration by roughly 8% on average, with larger effects among younger, urban workers.',
      year: 2023,
      department: slugify('Economics'),
      degreeLevel: 'masters',
      documentType: 'thesis',
      authors: [{ name: 'Nadia Rahman' }],
      advisors: [{ name: 'Prof. Huang Wei', role: 'primary' }, { name: 'Dr. Ito' }],
      keywords: ['labor economics', 'informal transfers', 'asean'],
    },
    {
      title: 'The Rustle in the Pines: Ecological Metaphor in Modern Japanese Poetry',
      abstract:
        'Through close readings of five postwar poets, this paper argues that ecological metaphors serve not as ornament but as a primary epistemic register through which Japanese modernism articulates historical loss.',
      year: 2024,
      department: slugify('Literature'),
      degreeLevel: 'undergraduate',
      documentType: 'thesis',
      authors: [{ name: 'Mei Lin' }],
      advisors: [{ name: 'Prof. Marcus Linde' }],
      keywords: ['japanese literature', 'ecology', 'modernism', 'poetry'],
      license: 'CC-BY-NC-4.0',
    },
    {
      title: 'Designing Consent: User Interfaces for Research Participation',
      abstract:
        'A design study evaluating informed-consent flows across ten online research platforms. We propose a three-layer pattern - gist, detail, contract - and show through usability testing that the pattern improves both comprehension and completion rates.',
      year: 2025,
      department: slugify('Computer Science'),
      degreeLevel: 'undergraduate',
      documentType: 'research_paper',
      authors: [{ name: 'Priya Shah' }, { name: 'Leo Okonkwo' }],
      advisors: [{ name: 'Dr. Aisha Okafor' }],
      keywords: ['hci', 'consent', 'research ethics', 'ux'],
    },
    {
      title: 'From Margin to Memo: How Student Journalists Shape Campus Policy',
      abstract:
        'A mixed-methods study of campus journalism across three universities shows that student papers play a measurable role in accelerating policy revisions, particularly around student welfare and governance transparency.',
      year: 2022,
      department: slugify('Political Science'),
      degreeLevel: 'undergraduate',
      documentType: 'thesis',
      authors: [{ name: 'Sara Tomlinson' }],
      advisors: [{ name: 'Prof. Yamada' }],
      keywords: ['journalism', 'campus policy', 'media'],
    },
    {
      title: 'Translating Silence: A Reading of Four Korean Short Stories',
      abstract:
        'This paper approaches four Korean short stories as meditations on silence, proposing that narrative silence operates as a technique of ethical restraint rather than a gap in information.',
      year: 2023,
      department: slugify('School of International Liberal Studies'),
      degreeLevel: 'undergraduate',
      documentType: 'thesis',
      authors: [{ name: 'Dae-hyun Choi' }],
      advisors: [{ name: 'Prof. Marcus Linde' }],
      keywords: ['korean literature', 'translation', 'narrative'],
      license: 'CC-BY-4.0',
    },
  ]

  for (const p of papers) {
    const existing = await db.paper.findFirst({ where: { title: p.title } })

    const paperData = {
      title: p.title,
      subtitle: p.subtitle,
      abstract: p.abstract,
      year: p.year,
      publishedAt: new Date(`${p.year}-06-01`),
      language: 'en',
      degreeLevel: p.degreeLevel,
      documentType: p.documentType,
      license: p.license,
      status: 'published' as const,
      departmentId: bySlug[p.department].id,
      submittedById: admin.id,
    }

    if (existing) {
      await db.paper.update({
        where: { id: existing.id },
        data: paperData,
      })
      console.log(`[update] ${p.title}`)
      continue
    }

    const authorRecords = [] as { authorId: string; position: number }[]
    for (let i = 0; i < p.authors.length; i++) {
      const a = p.authors[i]
      const slug = await uniqSlug('author', slugify(a.name))
      const rec =
        (await db.author.findFirst({ where: a.email ? { email: a.email } : { name: a.name } })) ??
        (await db.author.create({ data: { name: a.name, email: a.email, orcid: a.orcid, slug } }))
      authorRecords.push({ authorId: rec.id, position: i })
    }

    const advisorRecords = [] as { advisorId: string; role: string | null }[]
    for (const a of p.advisors) {
      const slug = await uniqSlug('advisor', slugify(a.name))
      const rec =
        (await db.advisor.findFirst({ where: { name: a.name, email: null } })) ??
        (await db.advisor.create({ data: { name: a.name, slug } }))
      advisorRecords.push({ advisorId: rec.id, role: a.role ?? null })
    }

    const keywordRecords = [] as { keywordId: string }[]
    for (const term of p.keywords) {
      const normalized = term.toLowerCase()
      const rec =
        (await db.keyword.findUnique({ where: { term: normalized } })) ??
        (await db.keyword.create({
          data: { term: normalized, slug: await uniqSlug('keyword', slugify(normalized)) },
        }))
      keywordRecords.push({ keywordId: rec.id })
    }

    const paperSlug = await uniqSlug('paper', slugify(p.title))
    await db.paper.create({
      data: {
        slug: paperSlug,
        ...paperData,
        authors: { create: authorRecords },
        advisors: { create: advisorRecords },
        keywords: { create: keywordRecords },
      },
    })
    console.log(`[ok] ${p.title}`)
  }
}

async function uniqSlug(kind: 'author' | 'advisor' | 'keyword' | 'paper', base: string): Promise<string> {
  const check = async (slug: string) => {
    switch (kind) {
      case 'author':
        return !!(await db.author.findUnique({ where: { slug } }))
      case 'advisor':
        return !!(await db.advisor.findUnique({ where: { slug } }))
      case 'keyword':
        return !!(await db.keyword.findUnique({ where: { slug } }))
      case 'paper':
        return !!(await db.paper.findUnique({ where: { slug } }))
    }
  }
  let candidate = base || kind
  let n = 2
  while (await check(candidate)) candidate = `${base}-${n++}`
  return candidate
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })
