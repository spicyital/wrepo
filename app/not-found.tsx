import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-24 text-center">
      <p className="text-sm uppercase tracking-wider text-ink-500">404</p>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">Not found</h1>
      <p className="mt-4 text-ink-600">
        The page you are looking for does not exist, or the paper may have been unpublished.
      </p>
      <Link href="/" className="mt-8 inline-block text-accent-600 hover:text-accent-700">
        ← Back to home
      </Link>
    </main>
  )
}
