import { z } from 'zod';
import { userAddressSchema } from '../../../shared/address.js';

export default {
  params: z.object({ id: z.coerce.number().int().min(1) }),
  body: z.object({
    enabled: z.boolean(),
  }),
  response: {
    200: userAddressSchema,
    403: z.object({ message: z.string() }),
    404: z.object({ message: z.string() }),
  },
};
