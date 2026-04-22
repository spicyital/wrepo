import path from 'node:path'

const map: Record<string, string> = {
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.txt': 'text/plain; charset=utf-8',
}

export default function mime(filePath: string): string {
  return map[path.extname(filePath).toLowerCase()] ?? 'application/octet-stream'
}
