import Link from 'next/link'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const metadata = { title: 'Submission received' }

export default function SubmitThanksPage() {
  return (
    <>
      <Header />
      <main className="mx-auto max-w-2xl px-6 py-24 text-center">
        <p className="text-xs uppercase tracking-widest text-ink-500">Submit</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-900">Thank you.</h1>
        <p className="mt-4 text-ink-600">
          Your submission is in the review queue. An editor will get back to you by email if they need
          changes. You&apos;ll receive a link once it&apos;s published.
        </p>
        <div className="mt-10 flex justify-center gap-4">
          <Link
            href="/"
            className="rounded-md border border-ink-200 px-4 py-2 text-sm text-ink-800 no-underline hover:border-ink-300"
          >
            Back to home
          </Link>
          <Link
            href="/submit"
            className="rounded-md bg-ink-900 px-4 py-2 text-sm text-white no-underline hover:bg-ink-800"
          >
            Submit another
          </Link>
        </div>
      </main>
      <Footer />
    </>
  )
}
