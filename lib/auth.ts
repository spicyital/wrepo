import type { NextAuthOptions } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import bcrypt from 'bcryptjs'
import { db } from './db'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      email: string
      name?: string | null
      role: 'super_admin' | 'editor' | 'submitter'
    }
  }
  interface User {
    id: string
    email: string
    name?: string | null
    role: 'super_admin' | 'editor' | 'submitter'
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: 'super_admin' | 'editor' | 'submitter'
  }
}

export const authOptions: NextAuthOptions = {
  session: { strategy: 'jwt' },
  pages: { signIn: '/login' },
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(creds) {
        if (!creds?.email || !creds?.password) return null
        const user = await db.user.findUnique({ where: { email: creds.email.toLowerCase() } })
        if (!user) return null
        const ok = await bcrypt.compare(creds.password, user.passwordHash)
        if (!ok) return null
        return { id: user.id, email: user.email, name: user.name, role: user.role }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.role = user.role
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id
        session.user.role = token.role
      }
      return session
    },
  },
}

export function canEdit(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'editor'
}

export function canPublish(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'editor'
}

export function canSubmit(role: string | undefined): boolean {
  return role === 'super_admin' || role === 'editor' || role === 'submitter'
}
