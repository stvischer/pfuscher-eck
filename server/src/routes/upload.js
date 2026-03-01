import { createWriteStream, statSync } from 'fs'
import { pipeline } from 'stream/promises'
import { join, extname } from 'path'
import { randomUUID } from 'crypto'
import { uploadsDir } from '../plugins/staticfiles.js'

export default async function upload(fastify) {
  fastify.post('/api/upload', {
    preHandler: [fastify.authenticate],
  }, async (req, reply) => {
    const data = await req.file()
    if (!data) return reply.code(400).send({ error: 'No file provided' })

    const ext      = extname(data.filename || '') || ''
    const filename = `${randomUUID()}${ext}`
    const filepath = join(uploadsDir, filename)

    await pipeline(data.file, createWriteStream(filepath))

    const { size } = statSync(filepath)

    return {
      url:      `/uploads/${filename}`,
      name:     data.filename,
      mimetype: data.mimetype,
      size,
    }
  })
}
