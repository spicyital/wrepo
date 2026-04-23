import Link from 'next/link'
import { getServerSession } from 'next-auth'
import { authOptions, canEdit } from '@/lib/auth'

const nav = [
  { href: '/browse', label: 'Browse' },
  { href: '/search', label: 'Search' },
  { href: '/about', label: 'About' },
]

export async function Header() {
  const session = await getServerSession(authOptions)
  const signedIn = !!session?.user
  const isEditor = signedIn && canEdit(session.user.role)

  return (
    <header className="border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-6 py-4 sm:h-16 sm:flex-row sm:items-center sm:justify-between sm:py-0">
        <Link href="/" className="flex items-center gap-2 no-underline">
          <span className="font-serif text-xl font-semibold tracking-tight text-ink-900">WRepo</span>
          <span className="hidden text-xs uppercase tracking-widest text-ink-400 md:inline">
            public repository
          </span>
        </Link>
        <nav className="flex flex-wrap items-center gap-4 sm:justify-end sm:gap-6">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-ink-700 no-underline hover:text-ink-900"
            >
              {item.label}
            </Link>
          ))}
          {signedIn && (
            <Link
              href="/submit"
              className="text-sm text-ink-700 no-underline hover:text-ink-900"
            >
              Submit paper
            </Link>
          )}
          {isEditor ? (
            <Link
              href="/admin"
              className="rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-800 no-underline hover:border-ink-300"
            >
              Admin
            </Link>
          ) : signedIn ? (
            <span className="hidden text-xs text-ink-500 md:inline">{session.user.email}</span>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/signup"
                className="text-sm text-ink-700 no-underline hover:text-ink-900"
              >
                Submitter account
              </Link>
              <Link
                href="/login"
                className="rounded-md border border-ink-200 px-3 py-1.5 text-sm text-ink-800 no-underline hover:border-ink-300"
              >
                Repository sign in
              </Link>
            </div>
          )}
        </nav>
      </div>
    </header>
  )
}
