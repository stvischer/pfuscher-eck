import { z } from 'zod';

export default {
  body: z.object({
    username: z.string().min(3).max(50),
    email: z.string().email(),
    password: z.string().min(8),
  }),
  response: {
    201: z.object({
      accessToken: z.string(),
      refreshToken: z.string(),
      user: z.object({
        id: z.number(),
        username: z.string(),
        email: z.string().email(),
        role: z.enum(['user', 'admin']),
      }),
    }),
    409: z.object({
      message: z.string(),
    }),
  },
};
