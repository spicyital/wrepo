import type { Metadata } from 'next'
import './globals.css'
import { SessionProviderShell } from '@/components/SessionProviderShell'
import { siteBaseUrl, siteDescription, siteName } from '@/lib/llms'

export const metadata: Metadata = {
  metadataBase: new URL(siteBaseUrl),
  title: { default: siteName, template: `%s - ${siteName}` },
  description: siteDescription,
  openGraph: {
    siteName,
    title: siteName,
    description: siteDescription,
    type: 'website',
    url: siteBaseUrl,
  },
  twitter: { card: 'summary_large_image', title: siteName, description: siteDescription },
  robots: { index: true, follow: true },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        <SessionProviderShell>{children}</SessionProviderShell>
      </body>
    </html>
  )
}
