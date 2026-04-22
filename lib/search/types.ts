export interface SearchHit {
  id: string
  slug: string
  title: string
  abstract: string
  year: number
  department?: string | null
  score: number
}

export interface SearchQuery {
  q: string
  limit?: number
  offset?: number
  filters?: {
    departmentSlug?: string
    year?: number
    documentType?: string
  }
}

export interface SearchService {
  query(args: SearchQuery): Promise<{ hits: SearchHit[]; total: number }>
  /** Hook for keeping an external index in sync. Noop for in-DB search. */
  indexPaper(paperId: string): Promise<void>
  removePaper(paperId: string): Promise<void>
}
