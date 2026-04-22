import { getServerSession } from 'next-auth'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { authOptions, canEdit } from '@/lib/auth'
import { SignOutButton } from '@/components/admin/SignOutButton'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession(authOptions)
  if (!session?.user) redirect('/login?callbackUrl=/admin')
  if (!canEdit(session.user.role)) redirect('/')

  return (
    <div className="min-h-screen bg-ink-50/40">
      <header className="border-b border-ink-100 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-6">
          <div className="flex items-center gap-6">
            <Link href="/admin" className="font-serif text-lg text-ink-900 no-underline">
              WRepo <span className="text-ink-400">/ admin</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/admin/papers" className="text-ink-700 no-underline hover:text-ink-900">Papers</Link>
              <Link href="/submit" className="text-ink-700 no-underline hover:text-ink-900">New</Link>
              <Link href="/" className="text-ink-500 no-underline hover:text-ink-800">View site ↗</Link>
            </nav>
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-ink-500">{session.user.email}</span>
            <span className="rounded-full bg-ink-100 px-2 py-0.5 text-xs uppercase tracking-wider text-ink-700">
              {session.user.role.replace('_', ' ')}
            </span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
