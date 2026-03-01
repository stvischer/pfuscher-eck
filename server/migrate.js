import { createConnection } from 'mariadb'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { config } from 'dotenv'

config()

const __dir = dirname(fileURLToPath(import.meta.url))
const migrationsDir = join(__dir, 'src', 'db', 'migrations')

const migrations = [
  '001_create_users.sql',
  '002_seed_admin.sql',
  '003_create_refresh_tokens.sql',
  '004_create_chat.sql',
  '005_seed_chat.sql',
  '006_create_chats.sql',
  '007_seed_dm_chat.sql',
  '008_seed_dummy_conversations.sql',
]

const conn = await createConnection({
  host:     process.env.DB_HOST     || 'localhost',
  port:     Number(process.env.DB_PORT) || 3306,
  user:     process.env.DB_USER     || 'root',
  password: process.env.DB_PASSWORD || '',
})

console.log('Connected to MariaDB')

// Create database
await conn.query(
  `CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
)
console.log(`Database \`${process.env.DB_NAME}\` ready`)

await conn.query(`USE \`${process.env.DB_NAME}\``)

for (const file of migrations) {
  const sql = readFileSync(join(migrationsDir, file), 'utf8')
  // Split on semicolons to run each statement individually
  const statements = sql
    .split(';')
    .map((s) => s.trim())
    .filter(Boolean)

  for (const stmt of statements) {
    await conn.query(stmt)
  }
  console.log(`  ✓ ${file}`)
}

await conn.end()
console.log('Done.')
