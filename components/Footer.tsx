import Link from 'next/link'

export function Footer() {
  const year = new Date().getFullYear()
  return (
    <footer className="mt-auto border-t border-ink-100 bg-white">
      <div className="mx-auto grid max-w-6xl gap-8 px-6 py-12 text-sm text-ink-600 md:grid-cols-4">
        <div>
          <div className="font-serif text-lg text-ink-900">WRepo</div>
          <p className="mt-2 max-w-xs text-ink-500">
            A repository for undergraduate theses, student research, and departmental scholarship.
          </p>
        </div>
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-ink-400">Explore</div>
          <ul className="space-y-2">
            <li><Link href="/browse" className="no-underline hover:text-ink-900">Browse</Link></li>
            <li><Link href="/search" className="no-underline hover:text-ink-900">Search</Link></li>
            <li><Link href="/submit" className="no-underline hover:text-ink-900">Submit</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-ink-400">About</div>
          <ul className="space-y-2">
            <li><Link href="/about" className="no-underline hover:text-ink-900">About WRepo</Link></li>
            <li><Link href="/about#policies" className="no-underline hover:text-ink-900">Policies</Link></li>
            <li><Link href="/about#contact" className="no-underline hover:text-ink-900">Contact</Link></li>
          </ul>
        </div>
        <div>
          <div className="mb-3 text-xs uppercase tracking-widest text-ink-400">Machine-readable</div>
          <ul className="space-y-2">
            <li><a href="/sitemap.xml" className="no-underline hover:text-ink-900">Sitemap</a></li>
            <li><a href="/robots.txt" className="no-underline hover:text-ink-900">robots.txt</a></li>
          </ul>
        </div>
      </div>
      <div className="border-t border-ink-100">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4 text-xs text-ink-500">
          <span>© {year} WRepo</span>
          <span>Open scholarship, responsibly archived.</span>
        </div>
      </div>
    </footer>
  )
}
