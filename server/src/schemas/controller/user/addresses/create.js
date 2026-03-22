import { z } from 'zod';
import { userAddressSchema } from '../../../shared/address.js';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    radius: z.number().int().min(0).optional().default(20),
    enabled: z.boolean().optional().default(true),
    street: z.string().max(255),
    city: z.string().max(100),
    state: z.string().max(100).optional().default(''),
    postalCode: z.string().max(20),
    country: z.string().max(100),
    lat: z.number(),
    lon: z.number(),
  }),
  response: {
    200: userAddressSchema,
    201: userAddressSchema,
    403: z.object({ message: z.string() }),
  },
};
