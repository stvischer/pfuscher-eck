import { z } from 'zod';

/**
 * Address type enum: offer (user skills), request (repair), meeting.
 */
export const addressTypeSchema = z.enum(['offer', 'request', 'meeting']);

/**
 * Full address response object.
 */
export const addressSchema = z.object({
  id: z.number(),
  type: addressTypeSchema,
  entityId: z.number(),
  radius: z.number(),
  enabled: z.boolean(),
  street: z.string(),
  city: z.string(),
  state: z.string(),
  postalCode: z.string(),
  country: z.string(),
  lat: z.number().nullable(),
  lon: z.number().nullable(),
});
