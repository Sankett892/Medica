import { z } from 'zod';

export const updatePatientMeSchema = z.object({
  phone: z.string().optional(),
  location: z.object({
    city: z.string().optional().default('Pune'),
    state: z.string().optional().default('Maharashtra'),
    country: z.string().optional().default('India'),
    locality: z.string().optional(),
    address: z.string().optional()
  }).optional(),
  emergencyContact: z.object({
    name: z.string().min(1),
    relationship: z.string().min(1),
    phone: z.string().min(1)
  }).optional()
});

export const listRecordsQuerySchema = z.object({
  cat: z.string().optional().default('all'),
  q: z.string().optional().default(''),
  page: z.coerce.number().optional().default(1),
  pageSize: z.coerce.number().optional().default(50)
});

export type UpdatePatientMeInput = z.infer<typeof updatePatientMeSchema>;
export type ListRecordsQuery = z.infer<typeof listRecordsQuerySchema>;
