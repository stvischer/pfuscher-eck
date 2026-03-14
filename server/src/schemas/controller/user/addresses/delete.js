import { z } from 'zod';
import { addressSchema } from '../../../shared/address.js';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
    aid: z.coerce.number().int().min(1),
  }),
  response: {
    200: z.array(addressSchema),
    403: z.object({ message: z.string() }),
    404: z.object({ message: z.string() }),
  },
};
