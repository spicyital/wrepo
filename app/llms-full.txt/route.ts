import { formatLlmsFullText } from '@/lib/llms'

export async function GET() {
  return new Response(formatLlmsFullText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
