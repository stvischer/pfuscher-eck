import { z } from 'zod';
import { userAddressSchema } from '../../shared/address.js';
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
  address: userAddressSchema.nullable(),
  createdAt: z.string(),
});

export default {
  params: z.object({
    id: z.coerce.number().int().min(1),
  }),
  body: z.object({
    username: z.string().min(3).max(50).optional(),
    displayName: z.string().max(100).optional(),
    email: z.string().email().optional(),
    bio: z.string().max(1000).optional(),
    phone: z.string().max(30).optional(),
  }),
  response: {
    200: userSchema,
    400: z.object({ message: z.string() }),
    403: z.object({ message: z.string() }),
    409: z.object({ message: z.string() }),
  },
};
