import path from 'node:path'
import type { StorageService } from './types'
import { createLocalStorage } from './local'

let instance: StorageService | null = null

export function storage(): StorageService {
  if (instance) return instance
  const driver = process.env.STORAGE_DRIVER ?? 'local'
  switch (driver) {
    case 'local': {
      const root = process.env.STORAGE_LOCAL_PATH ?? './storage'
      instance = createLocalStorage(path.resolve(process.cwd(), root))
      return instance
    }
    // Add 's3' here later. The interface is stable.
    default:
      throw new Error(`Unknown STORAGE_DRIVER: ${driver}`)
  }
}

export type { StorageService, StoredFile } from './types'
