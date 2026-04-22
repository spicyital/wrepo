import { NextRequest, NextResponse } from 'next/server'
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { getServerSession } from 'next-auth'
import { authOptions, canEdit } from '@/lib/auth'
import { db } from '@/lib/db'
import { logger } from '@/lib/logger'
import mime from './mime'

export const dynamic = 'force-dynamic'

const internalHeaders = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, noarchive',
}

/**
 * Local-file serving endpoint. Authorizes access before serving:
 *   - PDFs are only public if the owning paper is published, not embargoed,
 *     and not soft-deleted. Editors and super_admins can always read.
 *   - Covers follow the same visibility rules as the paper.
 *   - Any file whose key doesn't match a known Paper row requires editor role.
 *
 * Once object storage is wired in, replace this route with signed URLs from
 * the storage driver.
 */
export async function GET(_req: NextRequest, { params }: { params: { path: string[] } }) {
  const rel = (params.path ?? []).map(decodeURIComponent).join('/')
  if (!rel || rel.includes('..') || rel.includes('\0')) {
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: internalHeaders })
  }

  const root = path.resolve(process.cwd(), process.env.STORAGE_LOCAL_PATH ?? './storage')
  const full = path.resolve(root, rel)
  if (!full.startsWith(root + path.sep) && full !== root) {
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: internalHeaders })
  }

  // Authorization
  const authz = await authorizeRead(rel)
  if (!authz.ok) {
    return NextResponse.json({ error: authz.error }, { status: authz.status, headers: internalHeaders })
  }

  try {
    const stat = await fs.stat(full)
    if (!stat.isFile()) {
      return NextResponse.json({ error: 'not found' }, { status: 404, headers: internalHeaders })
    }
    const data = await fs.readFile(full)
    const type = mime(full)
    return new NextResponse(data, {
      status: 200,
      headers: {
        'Content-Type': type,
        'Content-Length': String(stat.size),
        'Cache-Control': authz.private ? 'private, no-store' : 'public, max-age=3600',
        'Content-Disposition': 'inline',
        'X-Content-Type-Options': 'nosniff',
        'X-Robots-Tag': 'noindex, noarchive',
        ...(authz.private ? { Vary: 'Cookie' } : {}),
      },
    })
  } catch (err) {
    logger.warn('file read failed', { rel, err: (err as Error).message })
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: internalHeaders })
  }
}

type Authz =
  | { ok: true; private: boolean }
  | { ok: false; error: string; status: number }

async function authorizeRead(key: string): Promise<Authz> {
  const paper = await db.paper.findFirst({
    where: { OR: [{ pdfPath: key }, { coverPath: key }] },
    select: { status: true, embargoUntil: true, deletedAt: true, pdfPath: true },
  })

  if (!paper) {
    return { ok: false, error: 'not found', status: 404 }
  }

  const isPublic =
    paper.status === 'published' &&
    !paper.deletedAt &&
    (!paper.embargoUntil || paper.embargoUntil <= new Date())

  if (isPublic) return { ok: true, private: false }

  // Editors and super_admins can access paper-bound private files for review.
  const session = await getServerSession(authOptions)
  if (session?.user && canEdit(session.user.role)) return { ok: true, private: true }

  return { ok: false, error: 'not found', status: 404 }
}
