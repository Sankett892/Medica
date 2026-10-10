import { z } from 'zod';

export const surveillanceQuerySchema = z.object({
  disease: z.enum(['ili', 'dengue', 'add']).optional().default('ili'),
  region: z.string().optional().default('all'),
  period: z.coerce.number().optional().default(30)
});

export const facilitiesQuerySchema = z.object({
  q: z.string().optional().default(''),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(5)
});

export const auditQuerySchema = z.object({
  q: z.string().optional().default(''),
  outcome: z.string().optional(),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(50)
});

export const privacyThresholdSchema = z.object({
  threshold: z.coerce.number().min(2).max(50).optional().default(5)
});

export type SurveillanceQuery = z.infer<typeof surveillanceQuerySchema>;
export type FacilitiesQuery = z.infer<typeof facilitiesQuerySchema>;
export type AuditQuery = z.infer<typeof auditQuerySchema>;
export type PrivacyThresholdInput = z.infer<typeof privacyThresholdSchema>;
