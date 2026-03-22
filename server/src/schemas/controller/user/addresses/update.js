import { z } from 'zod';
import { addressSchema } from '../../../shared/address.js';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    radius: z.number().int().min(0).optional(),
    enabled: z.boolean().optional(),
    street: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    lat: z.number().optional(),
    lon: z.number().optional(),
  }),
  response: {
    200: addressSchema,
    403: z.object({ message: z.string() }),
    404: z.object({ message: z.string() }),
  },
};
