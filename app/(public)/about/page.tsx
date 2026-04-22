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
      <h1 className="mt-2 font-serif text-4xl text-ink-900">A credible home for student research and working papers.</h1>

      <div className="prose prose-ink mt-10 max-w-none text-ink-700">
        <p>
          WRepo is a self-hosted academic repository for undergraduate theses, student research papers,
          and working papers. Its purpose is practical: to give publishable work a stable public home
          with clear metadata, citation support, and a durable URL.
        </p>

        <h2 className="mt-10 font-serif text-2xl text-ink-900">What is public</h2>
        <p>
          Published papers and metadata on WRepo are publicly accessible by design. Public paper pages
          include structured metadata, abstracts, citation formats, and machine-readable discovery
          surfaces such as JSON-LD, <code> llms.txt</code>, <code> llms-full.txt</code>, and a limited
          read-only metadata API for published papers.
        </p>
        <p>
          Unpublished submissions are not part of the public corpus. Embargoed works may appear as
          metadata-only records until the embargo period ends; the file itself remains unavailable during
          that time.
        </p>
        <p>
          Administrative, submission, authentication, and operational routes are not part of the public
          repository surface.
        </p>

        <h2 id="policies" className="mt-10 font-serif text-2xl text-ink-900">Policies</h2>
        <ul>
          <li><strong>Editorial review.</strong> Submissions are reviewed before publication for scope, metadata quality, and repository readiness.</li>
          <li><strong>Author rights.</strong> Authors retain copyright unless another agreement is stated on the record. Licensing is shown per paper.</li>
          <li><strong>Embargoes.</strong> Authors and advisors may request an embargo. During an embargo, metadata may remain public while the file stays restricted.</li>
          <li><strong>Takedowns and corrections.</strong> WRepo will review requests involving copyright, privacy, major factual error, or other serious repository concerns.</li>
        </ul>

        <h2 id="contact" className="mt-10 font-serif text-2xl text-ink-900">Contact</h2>
        <p>
          For submission questions, metadata corrections, takedown requests, or institutional collaboration,
          please write to
          <a href={`mailto:${contactEmail}`}> {contactEmail}</a>.
        </p>
      </div>
    </article>
  )
}
