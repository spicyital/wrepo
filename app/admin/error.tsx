'use client'

import { useEffect } from 'react'

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('admin error', error.digest)
  }, [error])

  return (
    <div className="py-24 text-center">
      <h2 className="font-serif text-2xl text-ink-900">Admin error</h2>
      <p className="mt-2 text-sm text-ink-500">
        Something went wrong while loading this page.
      </p>
      <button
        onClick={() => reset()}
        className="mt-6 rounded-md bg-ink-900 px-4 py-2 text-sm text-white hover:bg-ink-800"
      >
        Try again
      </button>
    </div>
  )
}
