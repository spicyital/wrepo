type HeadersLike =
  | Headers
  | Record<string, string | string[] | undefined>
  | null
  | undefined

type Bucket = {
  count: number
  resetAt: number
}

type RateLimitOptions = {
  max: number
  windowMs: number
}

type RateLimitResult = {
  ok: boolean
  remaining: number
  retryAfterMs: number
}

const store: Map<string, Bucket> =
  (globalThis as { __wrepoRateLimitStore?: Map<string, Bucket> }).__wrepoRateLimitStore ??
  new Map<string, Bucket>()

;(globalThis as { __wrepoRateLimitStore?: Map<string, Bucket> }).__wrepoRateLimitStore = store

export function getClientIdentifier(headersLike: HeadersLike, fallback = 'anonymous') {
  const realIp = normalizeIp(readHeader(headersLike, 'x-real-ip'))
  if (realIp) return realIp

  const cfIp = normalizeIp(readHeader(headersLike, 'cf-connecting-ip'))
  if (cfIp) return cfIp

  const forwarded = readHeader(headersLike, 'x-forwarded-for')
  if (forwarded) {
    const firstHop = normalizeIp(forwarded.split(',')[0] ?? null)
    if (firstHop) return firstHop
  }

  return fallback
}

export function takeRateLimit(key: string, options: RateLimitOptions): RateLimitResult {
  const now = Date.now()
  const bucket = store.get(key)

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + options.windowMs })
    pruneBuckets(now)
    return { ok: true, remaining: Math.max(0, options.max - 1), retryAfterMs: 0 }
  }

  if (bucket.count >= options.max) {
    return { ok: false, remaining: 0, retryAfterMs: Math.max(0, bucket.resetAt - now) }
  }

  bucket.count += 1
  store.set(key, bucket)
  return { ok: true, remaining: Math.max(0, options.max - bucket.count), retryAfterMs: 0 }
}

function readHeader(headersLike: HeadersLike, name: string) {
  if (!headersLike) return null
  if (typeof (headersLike as Headers).get === 'function') {
    return (headersLike as Headers).get(name)
  }

  const value =
    (headersLike as Record<string, string | string[] | undefined>)[name] ??
    (headersLike as Record<string, string | string[] | undefined>)[name.toLowerCase()]

  return Array.isArray(value) ? value[0] ?? null : value ?? null
}

function normalizeIp(value: string | null) {
  const trimmed = value?.trim()
  return trimmed ? trimmed : null
}

function pruneBuckets(now: number) {
  if (store.size < 500) return
  for (const [key, bucket] of store.entries()) {
    if (bucket.resetAt <= now) store.delete(key)
  }
}
