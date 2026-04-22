import { formatLlmsText } from '@/lib/llms'

export async function GET() {
  return new Response(formatLlmsText(), {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
    },
  })
}
