export interface StoredFile {
  key: string          // logical identifier used to retrieve the file later
  size: number
  mimeType: string
}

export interface StorageService {
  /** Store raw bytes under a logical path relative to the storage root. */
  put(key: string, data: Buffer, mimeType: string): Promise<StoredFile>
  /** Return a readable stream or buffer for serving. */
  get(key: string): Promise<{ data: Buffer; mimeType: string; size: number }>
  /** Delete a stored object. No-op if missing. */
  remove(key: string): Promise<void>
  /** Does the object exist? */
  exists(key: string): Promise<boolean>
  /** Produce a URL the app can link to. For local, this is a signed /api/files path. */
  url(key: string): string
}
