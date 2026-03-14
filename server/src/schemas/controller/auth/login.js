import { z } from 'zod';

export default {
  body: z.object({
    email: z.string().email(),
    password: z.string().min(8),
  }),
  response: {
    200: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      user: z.object({
        id: z.number(),
        username: z.string(),
        email: z.string().email(),
        role: z.enum(['user', 'admin']),
      }),
    }),
    401: z.object({
      message: z.string(),
    }),
  },
};
