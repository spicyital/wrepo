'use client'

import { useEffect } from 'react'

export default function PublicError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log the digest only; full stack is captured server-side.
    console.error('public error', error.digest)
  }, [error])

  return (
    <div className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-xs uppercase tracking-widest text-ink-500">Error</p>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">Something went wrong.</h1>
      <p className="mt-4 text-ink-600">
        An unexpected error occurred. Try again in a moment. If this keeps happening, please let us know.
      </p>
      <div className="mt-8 flex justify-center gap-3">
        <button
          onClick={() => reset()}
          className="rounded-md bg-ink-900 px-4 py-2 text-sm text-white hover:bg-ink-800"
        >
          Try again
        </button>
        <a
          href="/"
          className="rounded-md border border-ink-200 px-4 py-2 text-sm text-ink-800 no-underline hover:border-ink-300"
        >
          Back to home
        </a>
      </div>
    </div>
  )
}
