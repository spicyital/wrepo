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
import { getClientIdentifier, takeRateLimit } from '@/lib/rate-limit'

/**
 * Internal helper endpoint for authenticated upload flows.
 * Server actions are the primary path; this route is not part of the public
 * discovery surface and intentionally returns only minimal upload state.
 */
export const dynamic = 'force-dynamic'

const internalHeaders = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
}

function isUploadApiEnabled() {
  return process.env.ENABLE_UPLOAD_API === '1'
}

export async function POST(req: NextRequest) {
  if (!isUploadApiEnabled()) {
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: internalHeaders })
  }

  const uploadLimit = takeRateLimit(`upload:${getClientIdentifier(req.headers, 'upload')}`, {
    max: 20,
    windowMs: 15 * 60 * 1000,
  })
  if (!uploadLimit.ok) {
    return NextResponse.json(
      { error: 'too many uploads, please try again later' },
      {
        status: 429,
        headers: {
          ...internalHeaders,
          'Retry-After': String(Math.ceil(uploadLimit.retryAfterMs / 1000)),
        },
      },
    )
  }

  const session = await getServerSession(authOptions)
  if (!session?.user || !canSubmit(session.user.role)) {
    return NextResponse.json({ error: 'not authorized' }, { status: 401, headers: internalHeaders })
  }

  try {
    const form = await req.formData()
    const file = form.get('file')
    const kind = String(form.get('kind') ?? 'pdf')
    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'missing file' }, { status: 400, headers: internalHeaders })
    }

    const max = kind === 'pdf' ? PDF_MAX_BYTES : IMAGE_MAX_BYTES
    if (file.size > max) {
      return NextResponse.json({ error: 'file too large' }, { status: 413, headers: internalHeaders })
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    let key: string
    if (kind === 'pdf') {
      assertPdf(bytes, file.type)
      key = generatePdfKey()
    } else if (kind === 'cover') {
      assertImage(bytes, file.type)
      key = generateCoverKey(file.type)
    } else {
      return NextResponse.json({ error: 'unknown kind' }, { status: 400, headers: internalHeaders })
    }

    const stored = await storage().put(key, bytes, file.type)
    return NextResponse.json(
      { uploaded: true, size: stored.size, mimeType: file.type },
      {
        headers: internalHeaders,
      },
    )
  } catch (err) {
    if (err instanceof UploadError) {
      return NextResponse.json({ error: err.message }, { status: 400, headers: internalHeaders })
    }
    logger.error('upload failed', { err: (err as Error).message })
    return NextResponse.json({ error: 'upload failed' }, { status: 500, headers: internalHeaders })
  }
}
