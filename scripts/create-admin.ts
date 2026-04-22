/**
 * Create or reset the bootstrap admin user.
 *
 * Run with: npm run admin:create
 * Reads ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_NAME from env.
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const db = new PrismaClient()

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? '').toLowerCase()
  const password = process.env.ADMIN_PASSWORD
  const name = process.env.ADMIN_NAME ?? 'WRepo Administrator'

  if (!email || !password) {
    console.error('ADMIN_EMAIL and ADMIN_PASSWORD must be set in the environment.')
    process.exit(1)
  }

  const passwordHash = await bcrypt.hash(password, 10)
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, name, role: 'super_admin' },
    create: { email, passwordHash, name, role: 'super_admin' },
  })
  console.log(`✔ admin ready: ${user.email} (${user.role})`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
