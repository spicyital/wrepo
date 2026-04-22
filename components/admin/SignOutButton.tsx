'use client'

import { signOut } from 'next-auth/react'

export function SignOutButton() {
  return (
    <button
      type="button"
      onClick={() => signOut({ callbackUrl: '/' })}
      className="text-ink-500 hover:text-ink-900"
    >
      Sign out
    </button>
  )
}
