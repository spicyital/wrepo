import { timingSafeEqual } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

const internalHeaders = {
  'Cache-Control': 'no-store',
  'X-Robots-Tag': 'noindex, nofollow',
}

const devHealthTokenPlaceholders = new Set([
  'dev-only-change-me-before-production',
  'dev-only-healthcheck-token-before-production',
])

/**
 * Liveness + shallow readiness probe. Docker uses this in HEALTHCHECK.
 * Runs a 1ms DB round-trip so a wedged Postgres surfaces as unhealthy.
 */
export async function GET(req: NextRequest) {
  if (!isInternalHealthRequest(req)) {
    return NextResponse.json({ error: 'not found' }, { status: 404, headers: internalHeaders })
  }

  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true }, { headers: internalHeaders })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503, headers: internalHeaders })
  }
}

function isInternalHealthRequest(req: NextRequest) {
  const expected = process.env.HEALTHCHECK_TOKEN?.trim()
  if (!expected || isDevPlaceholderHealthToken(expected)) {
    return process.env.NODE_ENV !== 'production'
  }

  return hasValidHealthcheckToken(req.headers.get('x-wrepo-health-token'), expected)
}

function isDevPlaceholderHealthToken(value: string) {
  return process.env.NODE_ENV !== 'production' && devHealthTokenPlaceholders.has(value)
}

function hasValidHealthcheckToken(provided: string | null, expected: string) {
  const candidate = provided?.trim()
  if (!candidate) return false

  const left = Buffer.from(candidate)
  const right = Buffer.from(expected)
  if (left.length !== right.length) return false

  return timingSafeEqual(left, right)
}
