import { promises as fs } from 'node:fs'
import path from 'node:path'
import type { StorageService, StoredFile } from './types'

/**
 * Filesystem-backed storage. Keys are treated as POSIX-style paths relative to the root.
 * Path traversal (..) is rejected to avoid escaping the storage dir.
 */
export function createLocalStorage(rootDir: string): StorageService {
  const root = path.resolve(rootDir)

  function resolveSafe(key: string) {
    const normalized = path.posix.normalize(key).replace(/^\/+/, '')
    if (normalized.includes('..')) throw new Error(`invalid storage key: ${key}`)
    return path.join(root, normalized)
  }

  return {
    async put(key, data, mimeType): Promise<StoredFile> {
      const full = resolveSafe(key)
      await fs.mkdir(path.dirname(full), { recursive: true })
      await fs.writeFile(full, data)
      const stat = await fs.stat(full)
      return { key, size: stat.size, mimeType }
    },
    async get(key) {
      const full = resolveSafe(key)
      const data = await fs.readFile(full)
      const stat = await fs.stat(full)
      return { data, mimeType: 'application/octet-stream', size: stat.size }
    },
    async remove(key) {
      try {
        await fs.unlink(resolveSafe(key))
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
      }
    },
    async exists(key) {
      try {
        await fs.access(resolveSafe(key))
        return true
      } catch {
        return false
      }
    },
    url(key) {
      return `/api/files/${encodeURI(key)}`
    },
  }
}
