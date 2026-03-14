import { z } from 'zod';

export default {
  // Das Body-Schema macht den refreshToken optional
  body: z.object({
    refreshToken: z.string().optional(),
  }),
  // Definition der erfolgreichen Antwort
  response: {
    200: z.object({
      message: z.string(),
    }),
  },
};
