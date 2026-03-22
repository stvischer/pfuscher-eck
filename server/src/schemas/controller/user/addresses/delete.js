import { z } from 'zod';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  response: {
    204: z.undefined(),
    403: z.object({ message: z.string() }),
    404: z.object({ message: z.string() }),
  },
};
