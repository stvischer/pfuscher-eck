import { z } from 'zod';
import { addressSchema } from '../../shared/address.js';
import { skillSchema } from '../../shared/skill.js';

const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  displayName: z.string().nullable(),
  email: z.string().email(),
  role: z.enum(['user', 'admin']),
  bio: z.string().nullable(),
  phone: z.string().nullable(),
  skills: z.array(skillSchema),
  addresses: z.array(addressSchema),
  createdAt: z.string().datetime(),
});

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  response: {
    200: userSchema,
    403: z.object({ message: z.string() }),
    404: z.object({ message: z.string() }),
  },
};
