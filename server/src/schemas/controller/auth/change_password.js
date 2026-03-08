import { z } from 'zod';

export default {
  body: z.object({
    // Das Refresh-Token ist ein Pflichtfeld
    refreshToken: z.string().min(1, 'Refresh-Token ist erforderlich'),
  }),
  response: {
    200: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
    }),
    401: z.object({
      message: z.string(),
    }),
  },
};
