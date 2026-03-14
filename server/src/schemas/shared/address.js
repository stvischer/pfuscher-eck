import { z } from 'zod';

export const addressSchema = z.object({
  id: z.number(),
  addressId: z.number(),
  addressType: z.string(),
  radiusM: z.number().nullable(),
  street: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  postalCode: z.string().nullable(),
  country: z.string().nullable(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});
