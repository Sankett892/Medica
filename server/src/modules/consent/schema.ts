import { z } from 'zod';

export const createGrantSchema = z.object({
  recipient: z.string().min(1),
  role: z.string().min(1),
  org: z.string().min(1),
  orgId: z.string().optional(),
  scope: z.array(z.string()).min(1),
  purpose: z.string().min(1),
  validityDays: z.coerce.number().optional().default(30)
});

export type CreateGrantInput = z.infer<typeof createGrantSchema>;
