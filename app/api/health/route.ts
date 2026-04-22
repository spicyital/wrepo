import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

/**
 * Liveness + shallow readiness probe. Docker uses this in HEALTHCHECK.
 * Runs a 1ms DB round-trip so a wedged Postgres surfaces as unhealthy.
 */
export async function GET() {
  try {
    await db.$queryRaw`SELECT 1`
    return NextResponse.json({ ok: true })
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 })
  }
}
