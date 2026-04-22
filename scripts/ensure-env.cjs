const fs = require('node:fs')
const path = require('node:path')

const root = process.cwd()
const envPath = path.join(root, '.env')
const examplePath = path.join(root, '.env.example')

if (fs.existsSync(envPath) || !fs.existsSync(examplePath)) {
  process.exit(0)
}

fs.copyFileSync(examplePath, envPath)
console.log('[wrepo] created .env from .env.example')
