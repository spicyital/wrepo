'use client'

import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useSearchParams } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

export function LoginForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const params = useSearchParams()
  const callbackUrl = params.get('callbackUrl') || '/submit'
  const registered = params.get('registered') === '1'

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setBusy(true)
    const res = await signIn('credentials', { email, password, redirect: false, callbackUrl })
    setBusy(false)
    if (res?.error) setError('Invalid email or password.')
    else if (res?.ok) window.location.assign(res.url ?? callbackUrl)
  }

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full">
        <Link href="/" className="text-xs uppercase tracking-widest text-ink-500 no-underline hover:text-ink-800">
          ← WRepo
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-ink-900">Sign in</h1>
        <p className="mt-1 text-sm text-ink-500">For authors, editors, and repository staff.</p>

        {registered && (
          <div className="mt-6 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            Account created. You can sign in now.
          </div>
        )}

        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-700">Email</span>
            <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-700">Password</span>
            <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
          </label>
          {error && <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">{error}</div>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
        </form>

        <p className="mt-4 text-sm text-ink-500">
          Need an account?{' '}
          <Link href="/signup" className="text-accent-600 no-underline hover:text-accent-700">
            Create one
          </Link>
          .
        </p>
      </div>
    </main>
  )
}
