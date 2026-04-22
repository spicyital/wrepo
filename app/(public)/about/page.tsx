import type { Metadata } from 'next'
import { contactEmail } from '@/lib/llms'

export const metadata: Metadata = {
  title: 'About',
  description: 'About WRepo - a self-hosted academic paper repository.',
}

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-16 prose-serif">
      <p className="text-xs uppercase tracking-widest text-ink-500">About</p>
      <h1 className="mt-2 font-serif text-4xl text-ink-900">A quiet, credible home for student scholarship.</h1>

      <div className="prose prose-ink mt-10 max-w-none text-ink-700">
        <p>
          WRepo collects undergraduate theses, working papers, and departmental scholarship into a
          permanent, citable archive. Our goal is modest and specific: take good student work out of
          email threads and course folders, and give it a dignified, long-lived home.
        </p>

        <h2 id="policies" className="mt-10 font-serif text-2xl text-ink-900">Policies</h2>
        <ul>
          <li><strong>Editorial review.</strong> Submissions are reviewed by faculty editors for clarity and scope before publication.</li>
          <li><strong>Author rights.</strong> Authors retain copyright. Unless otherwise noted, works are distributed under CC BY 4.0.</li>
          <li><strong>Embargoes.</strong> Authors and advisors may request an embargo - the record remains listed, but the file is gated until the embargo lifts.</li>
          <li><strong>Takedowns.</strong> Takedown requests are honoured in cases of copyright concerns, privacy, or factual error.</li>
        </ul>

        <h2 id="contact" className="mt-10 font-serif text-2xl text-ink-900">Contact</h2>
        <p>
          For submission questions, takedowns, or collaboration requests, please write to
          <a href={`mailto:${contactEmail}`}> {contactEmail}</a>.
        </p>
      </div>
    </article>
  )
}
