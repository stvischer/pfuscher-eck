import { z } from 'zod';
import { userAddressSchema } from '../../../shared/address.js';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  response: {
    200: userAddressSchema.nullable(),
    403: z.object({ message: z.string() }),
  },
};
