import { z } from 'zod'

export const paperStatuses = [
  'draft', 'submitted', 'approved', 'rejected', 'published', 'archived',
] as const

export const degreeLevels = [
  'undergraduate', 'honours', 'masters', 'doctoral', 'other',
] as const

export const documentTypes = [
  'thesis', 'research_paper', 'article', 'report', 'working_paper', 'other',
] as const

const trimmedString = (min: number, max: number) =>
  z
    .string()
    .transform((s) => s.trim())
    .pipe(z.string().min(min).max(max))

export const paperInputSchema = z.object({
  title: trimmedString(3, 400),
  subtitle: z
    .string()
    .max(400)
    .optional()
    .nullable()
    .transform((s) => (typeof s === 'string' ? s.trim() || null : s)),
  abstract: trimmedString(50, 20_000),
  year: z
    .number({ invalid_type_error: 'Year must be a number.' })
    .int('Year must be whole.')
    .gte(1900, 'Year must be 1900 or later.')
    .lte(new Date().getFullYear() + 1, 'Year is too far in the future.'),
  publicationDate: z.string().datetime().optional().nullable(),
  language: z.string().min(2).max(8).default('en'),
  degreeLevel: z.enum(degreeLevels).default('undergraduate'),
  documentType: z.enum(documentTypes).default('thesis'),
  departmentSlug: z.string().min(1, 'Select a department.'),
  doi: z
    .string()
    .max(200, 'DOI is too long.')
    .refine((value) => !/\s/.test(value), 'DOI cannot contain spaces.')
    .optional()
    .nullable(),
  authors: z
    .array(
      z.object({
        name: trimmedString(1, 200),
        email: z.string().email().optional().nullable(),
        orcid: z.string().max(40).optional().nullable(),
      }),
    )
    .min(1, 'Add at least one author.')
    .max(50),
  advisors: z
    .array(
      z.object({
        name: trimmedString(1, 200),
        email: z.string().email().optional().nullable(),
        role: z.string().max(80).optional().nullable(),
      }),
    )
    .max(10)
    .default([]),
  keywords: z.array(trimmedString(1, 80)).max(30).default([]),
  license: z.string().max(80).optional().nullable(),
  embargoUntil: z.string().datetime().optional().nullable(),
})

export type PaperInput = z.infer<typeof paperInputSchema>

export const paperUpdateSchema = paperInputSchema.partial().extend({
  status: z.enum(paperStatuses).optional(),
})
export type PaperUpdate = z.infer<typeof paperUpdateSchema>
