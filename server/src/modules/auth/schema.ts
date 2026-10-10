import { z } from 'zod';

export const syncUserSchema = z.object({
  clerkUserId: z.string().min(1),
  email: z.string().email(),
  name: z.string().min(1),
  role: z.enum(['PATIENT', 'CLINICIAN', 'ADMIN']).optional().default('PATIENT'),
  orgId: z.string().optional()
});

export const loginSchema = z.object({
  email: z.string().optional(),
  password: z.string().optional(),
  persona: z.string().optional(),
  role: z.enum(['PATIENT', 'CLINICIAN', 'ADMIN']).optional()
});

export const registerSchema = z.object({
  role: z.enum(['PATIENT', 'CLINICIAN', 'ADMIN']),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  // Patient fields
  dob: z.string().optional(),
  age: z.coerce.number().optional(),
  sex: z.string().optional(),
  bloodType: z.string().optional(),
  phone: z.string().optional(),
  allergies: z.array(z.string()).optional(),
  // Clinician fields
  licenseNo: z.string().optional(),
  specialty: z.string().optional(),
  dept: z.string().optional(),
  facility: z.string().optional(),
  // Admin / General fields
  organization: z.string().optional()
});

export type SyncUserInput = z.infer<typeof syncUserSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
