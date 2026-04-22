import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import { authOptions, canSubmit } from '@/lib/auth'
import { db } from '@/lib/db'
import { PaperForm } from '@/components/admin/PaperForm'
import { submitPaper } from '@/app/actions/papers'
import { Header } from '@/components/Header'
import { Footer } from '@/components/Footer'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Submit a paper' }

export default async function SubmitPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login?callbackUrl=/submit')
  if (!canSubmit(session.user.role)) redirect('/')

  const departments = await db.department.findMany({ orderBy: { name: 'asc' } })

  return (
    <>
      <Header />
      <main className="mx-auto max-w-3xl px-6 py-16">
        <p className="text-xs uppercase tracking-widest text-ink-500">Submit</p>
        <h1 className="mt-2 font-serif text-4xl text-ink-900">New submission</h1>
        <p className="mt-2 max-w-prose text-ink-600">
          Fill in the public metadata for the work and upload the PDF. Submissions enter editorial
          review before publication. Unpublished work is not part of the public corpus, and embargoed
          files remain restricted until release.
        </p>
        <div className="mt-10">
          <PaperForm
            action={submitPaper}
            departments={departments.map((d) => ({ slug: d.slug, name: d.name }))}
            submitLabel="Submit for review"
            busyLabel="Uploading…"
            pdfRequired
          />
        </div>
      </main>
      <Footer />
    </>
  )
}
