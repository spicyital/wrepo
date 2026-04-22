'use client'

import { useState } from 'react'

export function PdfPreview({ src, title }: { src: string; title: string }) {
  const [loaded, setLoaded] = useState(false)
  return (
    <div className="overflow-hidden rounded-xl border border-ink-200 bg-ink-50">
      <div className="flex items-center justify-between border-b border-ink-100 bg-white px-4 py-2 text-xs text-ink-500">
        <span>PDF preview</span>
        <a href={src} className="text-accent-600 hover:text-accent-700" target="_blank" rel="noreferrer">
          Open in new tab ↗
        </a>
      </div>
      <object data={src} type="application/pdf" className="h-[70vh] w-full" onLoad={() => setLoaded(true)}>
        <iframe src={src} title={`${title} (PDF preview)`} className="h-[70vh] w-full" />
        {!loaded && (
          <div className="flex h-40 items-center justify-center p-6 text-center text-sm text-ink-600">
            Your browser does not support embedded PDFs.{' '}
            <a href={src} className="ml-1 text-accent-600 hover:text-accent-700">
              Download the PDF
            </a>.
          </div>
        )}
      </object>
    </div>
  )
}
