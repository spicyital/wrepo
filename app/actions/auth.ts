'use server'

import bcrypt from 'bcryptjs'
import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { z } from 'zod'
import { db } from '@/lib/db'
import { getClientIdentifier, takeRateLimit } from '@/lib/rate-limit'

const signupSchema = z
  .object({
    name: z.string().trim().min(2, 'Name must be at least 2 characters.').max(120),
    email: z.string().trim().email('Enter a valid email address.'),
    password: z.string().min(8, 'Password must be at least 8 characters.').max(200),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  })

export async function registerUser(
  _prevState: { error?: string } | undefined,
  formData: FormData,
): Promise<{ error?: string }> {
  const headerStore = headers()
  const signupLimit = takeRateLimit(`signup:${getClientIdentifier(headerStore, 'signup')}`, {
    max: 5,
    windowMs: 15 * 60 * 1000,
  })
  if (!signupLimit.ok) {
    return { error: 'Too many account creation attempts. Please wait a few minutes and try again.' }
  }

  const parsed = signupSchema.safeParse({
    name: formData.get('name'),
    email: formData.get('email'),
    password: formData.get('password'),
    confirmPassword: formData.get('confirmPassword'),
  })

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check your details and try again.' }
  }

  const email = parsed.data.email.toLowerCase()
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } })
  if (existing) {
    return { error: 'An account with that email already exists.' }
  }

  const role = 'submitter' as const
  const passwordHash = await bcrypt.hash(parsed.data.password, 10)

  await db.user.create({
    data: {
      name: parsed.data.name,
      email,
      passwordHash,
      role,
    },
  })

  redirect('/login?registered=1')
}
