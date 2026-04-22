import type { SearchService } from './types'
import { createPostgresSearch } from './postgres'

let instance: SearchService | null = null

export function search(): SearchService {
  if (instance) return instance
  const driver = process.env.SEARCH_DRIVER ?? 'postgres'
  switch (driver) {
    case 'postgres':
      instance = createPostgresSearch()
      return instance
    // Add 'meilisearch' | 'opensearch' here later.
    default:
      throw new Error(`Unknown SEARCH_DRIVER: ${driver}`)
  }
}

export type { SearchHit, SearchQuery, SearchService } from './types'
