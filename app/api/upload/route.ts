import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions, canSubmit } from '@/lib/auth'
import { storage } from '@/lib/storage'
import {
  assertImage,
  assertPdf,
  generateCoverKey,
  generatePdfKey,
  IMAGE_MAX_BYTES,
  PDF_MAX_BYTES,
  UploadError,
} from '@/lib/uploads'
import { logger } from '@/lib/logger'

/**
 * Optional upload endpoint for clients that prefer XHR over server actions.
 * Server actions are the primary path; this exists for future AJAX/drag-and-drop UX.
 */
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user || !canSubmit(session.user.role)) {
    return NextResponse.json({ error: 'not authorized' }, { status: 401 })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    const kind = String(form.get('kind') ?? 'pdf')
    if (!(file instanceof File)) return NextResponse.json({ error: 'missing file' }, { status: 400 })

    const max = kind === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES
    if (file.size > max) return NextResponse.json({ error: 'file too large' }, { status: 413 })

    const bytes = Buffer.from(await file.arrayBuffer())
    let key: string
    if (kind === 'pdf') {
      assertPdf(bytes, file.type)
      key = generatePdfKey()
    } else if (kind === 'cover') {
      assertImage(bytes, file.type)
      key = generateCoverKey(file.type)
    } else {
      return NextResponse.json({ error: 'unknown kind' }, { status: 400 })
    }

    const stored = await storage().put(key, bytes, file.type)
    return NextResponse.json({ key: stored.key, size: stored.size, url: storage().url(stored.key) })
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400 })
    }
    logger.error('upload failed', { err: (err as Error).message })
    return NextResponse.json({ error: 'upload failed' }, { status: 500 })
  }
}
