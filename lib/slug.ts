export function slugify(input: string): string {
  return input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const set = new Set(existing)
  const root = slugify(base) || 'item'
  if (!set.has(root)) return root
  let n = 2
  while (set.has(`${root}-${n}`)) n++
  return `${root}-${n}`
}
