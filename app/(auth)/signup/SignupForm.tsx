'use client'

import Link from 'next/link'
import { useFormState, useFormStatus } from 'react-dom'
import { registerUser } from '@/app/actions/auth'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

const initialState: { error?: string } = {}

export function SignupForm() {
  const [state, formAction] = useFormState(registerUser, initialState)

  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <div className="w-full">
        <Link href="/" className="text-xs uppercase tracking-widest text-ink-500 no-underline hover:text-ink-800">
          Back to WRepo
        </Link>
        <h1 className="mt-4 font-serif text-3xl text-ink-900">Create a submitter account</h1>
        <p className="mt-1 text-sm text-ink-500">
          Use this account to submit work for editorial review and repository correspondence.
        </p>

        <form action={formAction} className="mt-8 space-y-4">
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-700">Name</span>
            <Input name="name" required maxLength={120} autoFocus />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-700">Email</span>
            <Input name="email" type="email" required />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-700">Password</span>
            <Input name="password" type="password" required minLength={8} />
          </label>
          <label className="block">
            <span className="mb-1.5 block text-sm text-ink-700">Confirm password</span>
            <Input name="confirmPassword" type="password" required minLength={8} />
          </label>

          {state.error && (
            <div className="rounded-md border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-700">
              {state.error}
            </div>
          )}

          <SubmitButton />
        </form>

        <p className="mt-4 text-sm text-ink-500">
          Already have an account?{' '}
          <Link href="/login" className="text-accent-600 no-underline hover:text-accent-700">
            Repository sign in
          </Link>
          .
        </p>
      </div>
    </main>
  )
}

function SubmitButton() {
  const { pending } = useFormStatus()

  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? 'Creating account...' : 'Create submitter account'}
    </Button>
  )
}
