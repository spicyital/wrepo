import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined, locale = 'en-US') {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString(locale, { year: 'numeric', month: 'long', day: 'numeric' })
}

export function formatYear(year: number | null | undefined) {
  return year ? String(year) : ''
}

export function truncate(text: string, max = 240) {
  if (text.length <= max) return text
  return text.slice(0, max - 1).trimEnd() + '…'
}

export function absoluteUrl(path: string) {
  const base = process.env.APP_URL || process.env.NEXTAUTH_URL || 'https://wrepo.org'
  return new URL(path, base).toString()
}
