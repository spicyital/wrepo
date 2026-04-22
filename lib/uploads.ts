import { randomBytes } from 'node:crypto'

export const PDF_MAX_BYTES = 25 * 1024 * 1024
export const IMAGE_MAX_BYTES = 4 * 1024 * 1024

const allowedImageTypes = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif'])
const imageExtByType: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'image/gif': 'gif',
}

export function assertPdf(bytes: Buffer, mimeType: string) {
  if (mimeType !== 'application/pdf') {
    throw new UploadError('Only PDF files are accepted for the main document.')
  }
  // %PDF- in the first 1024 bytes. Some PDFs have a small BOM; scan a window.
  const head = bytes.subarray(0, 1024).toString('binary')
  if (!head.includes('%PDF-')) {
    throw new UploadError('Uploaded file does not look like a real PDF.')
  }
}

export function assertImage(bytes: Buffer, mimeType: string) {
  if (!allowedImageTypes.has(mimeType)) {
    throw new UploadError('Cover must be PNG, JPEG, WebP, or GIF.')
  }
  if (bytes.length < 8) throw new UploadError('Cover file is too small to be an image.')
  const sig = bytes.subarray(0, 12)
  const isPng = sig[0] === 0x89 && sig[1] === 0x50 && sig[2] === 0x4e && sig[3] === 0x47
  const isJpg = sig[0] === 0xff && sig[1] === 0xd8 && sig[2] === 0xff
  const isGif = sig[0] === 0x47 && sig[1] === 0x49 && sig[2] === 0x46
  const isWebp =
    sig[0] === 0x52 && sig[1] === 0x49 && sig[2] === 0x46 && sig[3] === 0x46 &&
    sig[8] === 0x57 && sig[9] === 0x45 && sig[10] === 0x42 && sig[11] === 0x50
  if (!(isPng || isJpg || isGif || isWebp)) {
    throw new UploadError('Uploaded cover does not look like a real image.')
  }
}

export function imageExtension(mimeType: string): string {
  return imageExtByType[mimeType] ?? 'bin'
}

export function generatePdfKey(): string {
  return `papers/${new Date().getFullYear()}/${randomBytes(12).toString('hex')}.pdf`
}

export function generateCoverKey(mimeType: string): string {
  return `covers/${new Date().getFullYear()}/${randomBytes(12).toString('hex')}.${imageExtension(mimeType)}`
}

export class UploadError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UploadError'
  }
}
