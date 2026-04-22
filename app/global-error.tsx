'use client'

export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'ui-serif, Georgia, serif', padding: '4rem 1.5rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '2rem', margin: 0 }}>We ran into a problem.</h1>
        <p style={{ marginTop: '1rem', color: '#55554d' }}>
          The site hit an unexpected error. Please try again.
        </p>
        <button
          onClick={() => reset()}
          style={{
            marginTop: '1.5rem',
            background: '#1c1c19',
            color: '#fff',
            padding: '0.5rem 1rem',
            borderRadius: 6,
            border: 0,
            cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </body>
    </html>
  )
}
