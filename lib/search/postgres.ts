import { db } from '../db'
import type { SearchHit, SearchQuery, SearchService } from './types'

/**
 * PostgreSQL full-text search. Uses a tsvector computed in SQL migrations.
 * See prisma/migrations for the tsvector trigger/index setup.
 */
export function createPostgresSearch(): SearchService {
  return {
    async query({ q, limit = 20, offset = 0, filters }: SearchQuery) {
      const term = q.trim()
      const where: string[] = [`p."status" = 'published'`, `p."deletedAt" IS NULL`]
      const params: unknown[] = []

      if (filters?.departmentSlug) {
        params.push(filters.departmentSlug)
        where.push(`d."slug" = $${params.length}`)
      }
      if (filters?.year) {
        params.push(filters.year)
        where.push(`p."year" = $${params.length}`)
      }
      if (filters?.documentType) {
        params.push(filters.documentType)
        where.push(`p."documentType"::text = $${params.length}`)
      }

      let rankExpr = `0::float`
      let matchCondition = ''
      if (term.length > 0) {
        params.push(term)
        const tsIdx = params.length
        params.push(`%${escapeLike(term)}%`)
        const likeIdx = params.length
        const textMatch = [
          `p."title" ILIKE $${likeIdx} ESCAPE '\\'`,
          `COALESCE(p."subtitle", '') ILIKE $${likeIdx} ESCAPE '\\'`,
          `p."abstract" ILIKE $${likeIdx} ESCAPE '\\'`,
        ].join(' OR ')
        const authorMatch = `
          EXISTS (
            SELECT 1
            FROM "PaperAuthor" pa
            INNER JOIN "Author" a ON a."id" = pa."authorId"
            WHERE pa."paperId" = p."id"
              AND a."name" ILIKE $${likeIdx} ESCAPE '\\'
          )
        `
        const keywordMatch = `
          EXISTS (
            SELECT 1
            FROM "PaperKeyword" pk
            INNER JOIN "Keyword" k ON k."id" = pk."keywordId"
            WHERE pk."paperId" = p."id"
              AND k."term" ILIKE $${likeIdx} ESCAPE '\\'
          )
        `
        rankExpr = `
          (
            CASE
              WHEN p."searchVector" @@ websearch_to_tsquery('english', $${tsIdx})
              THEN ts_rank_cd(p."searchVector", websearch_to_tsquery('english', $${tsIdx}))
              ELSE 0
            END
            + CASE WHEN (${textMatch}) THEN 0.15 ELSE 0 END
            + CASE WHEN (${authorMatch}) THEN 0.35 ELSE 0 END
            + CASE WHEN (${keywordMatch}) THEN 0.25 ELSE 0 END
          )::float
        `
        matchCondition = `
          AND (
            (${textMatch})
            OR p."searchVector" @@ websearch_to_tsquery('english', $${tsIdx})
            OR (${authorMatch})
            OR (${keywordMatch})
          )
        `
      }

      const whereSql = where.join(' AND ')
      const sql = `
        SELECT p."id", p."slug", p."title", p."abstract", p."year",
               d."name" AS "departmentName",
               ${rankExpr} AS score
        FROM "Paper" p
        LEFT JOIN "Department" d ON d."id" = p."departmentId"
        WHERE ${whereSql} ${matchCondition}
        ORDER BY score DESC, p."publishedAt" DESC NULLS LAST
        LIMIT ${Number(limit)} OFFSET ${Number(offset)}
      `
      const countSql = `
        SELECT COUNT(*)::int AS total
        FROM "Paper" p
        LEFT JOIN "Department" d ON d."id" = p."departmentId"
        WHERE ${whereSql} ${matchCondition}
      `

      const rows = await db.$queryRawUnsafe<
        { id: string; slug: string; title: string; abstract: string; year: number; departmentName: string | null; score: number }[]
      >(sql, ...params)
      const countRow = await db.$queryRawUnsafe<{ total: number }[]>(countSql, ...params)

      const hits: SearchHit[] = rows.map((r) => ({
        id: r.id,
        slug: r.slug,
        title: r.title,
        abstract: r.abstract,
        year: r.year,
        department: r.departmentName,
        score: Number(r.score) || 0,
      }))
      return { hits, total: countRow[0]?.total ?? 0 }
    },
    async indexPaper() {
      // searchVector is maintained by a SQL trigger; nothing to do here.
    },
    async removePaper() {
      // Same — trigger handles it on DELETE.
    },
  }
}

function escapeLike(value: string) {
  return value.replace(/[\\%_]/g, '\\$&')
}
