import fp from 'fastify-plugin'
import fastifyStatic from '@fastify/static'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import { mkdirSync } from 'fs'

const __dirname = dirname(fileURLToPath(import.meta.url))
export const uploadsDir = join(__dirname, '../../uploads')
mkdirSync(uploadsDir, { recursive: true })

export default fp(async function staticfiles(fastify) {
  await fastify.register(fastifyStatic, {
    root:           uploadsDir,
    prefix:         '/uploads/',
    decorateReply:  false,
  })
}, { name: 'staticfiles' })
