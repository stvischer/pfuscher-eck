import { z } from 'zod';

export const skillSchema = z.object({
  skillId: z.number(),
  name: z.string(),
  category: z.string().nullable(),
  level: z.enum(['beginner', 'intermediate', 'expert']),
});
