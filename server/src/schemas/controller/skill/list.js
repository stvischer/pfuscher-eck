import { z } from 'zod';

const catalogSkillSchema = z.object({
  id: z.number(),
  name: z.string(),
  category: z.string().nullable(),
});

export default {
  response: {
    200: z.array(catalogSkillSchema),
  },
};
