import NodeGeocoder from 'node-geocoder'

const geocoder = NodeGeocoder({ provider: 'openstreetmap' })

function formatResult(r) {
  return {
    label:      r.formattedAddress,
    street:     [r.streetNumber, r.streetName].filter(Boolean).join(' '),
    city:       r.city        ?? null,
    state:      r.state       ?? null,
    postalCode: r.zipcode     ?? null,
    country:    r.country     ?? null,
    lat:        r.latitude    ?? null,
    lon:        r.longitude   ?? null,
  }
}

export default async function geocodeRoutes(fastify) {

  // GET /api/geocode/search?q=…
  fastify.get(
    '/api/geocode/search',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q:     { type: 'string', minLength: 2 },
            limit: { type: 'integer', default: 7 },
          },
        },
      },
    },
    async (request, reply) => {
      const { q, limit = 7 } = request.query
      try {
        const results = await geocoder.geocode({ address: q, limit })
        reply.send(results.map(formatResult))
      } catch {
        reply.code(502).send({ message: 'Geocoding service unavailable' })
      }
    },
  )

  // GET /api/geocode/reverse?lat=…&lon=…
  fastify.get(
    '/api/geocode/reverse',
    {
      preHandler: [fastify.authenticate],
      schema: {
        querystring: {
          type: 'object',
          required: ['lat', 'lon'],
          properties: {
            lat: { type: 'number' },
            lon: { type: 'number' },
          },
        },
      },
    },
    async (request, reply) => {
      const { lat, lon } = request.query
      try {
        const results = await geocoder.reverse({ lat, lon })
        if (!results.length) return reply.code(404).send({ message: 'No result found' })
        reply.send(formatResult(results[0]))
      } catch {
        reply.code(502).send({ message: 'Geocoding service unavailable' })
      }
    },
  )
}
