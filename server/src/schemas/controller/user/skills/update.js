import { z } from 'zod';
import { skillSchema } from '../../../shared/skill.js';

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    skills: z.array(
      z.object({
        skillId: z.number().int().min(1),
        level: z.enum(['beginner', 'intermediate', 'expert']).optional().default('beginner'),
      }),
    ),
  }),
  response: {
    200: z.array(skillSchema),
    403: z.object({ message: z.string() }),
  },
};
