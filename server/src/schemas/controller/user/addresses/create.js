import { z } from 'zod';
import { addressSchema } from '../../../shared/address.js';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    addressType: z.string().max(50).optional().default('home'),
    radiusM: z.number().int().min(0).nullable().optional(),
    street: z.string().max(255).optional(),
    city: z.string().max(100).optional(),
    state: z.string().max(100).optional(),
    postalCode: z.string().max(20).optional(),
    country: z.string().max(100).optional(),
    lat: z.number().nullable().optional(),
    lon: z.number().nullable().optional(),
  }),
  response: {
    200: z.array(addressSchema),
    201: z.array(addressSchema),
    403: z.object({ message: z.string() }),
  },
};
