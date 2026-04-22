export function JsonLd({ data }: { data: Record<string, unknown> }) {
  // Escape `<` so a malicious abstract can't close the script tag or smuggle in
  // HTML. JSON.stringify handles the rest.
  const json = JSON.stringify(data).replace(/</g, '\\u003c')
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />
}
