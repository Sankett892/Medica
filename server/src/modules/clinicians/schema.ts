import { z } from 'zod';

export const resolveQRSchema = z.object({
  token: z.string().min(1)
});

export const emergencyAccessSchema = z.object({
  patient: z.string().optional(),
  patientId: z.string().optional(),
  justification: z.string().min(5, 'A justification is required')
}).refine(data => data.patient || data.patientId, {
  message: 'Patient identifier or ID must be provided'
});

export const recordAccessSchema = z.object({
  action: z.string().min(1),
  resource: z.string().min(1)
});

export const clinicianPatientSearchSchema = z.object({
  q: z.string().optional().default('')
});

export type ResolveQRInput = z.infer<typeof resolveQRSchema>;
export type EmergencyAccessInput = z.infer<typeof emergencyAccessSchema>;
export type RecordAccessInput = z.infer<typeof recordAccessSchema>;
export type ClinicianPatientSearchInput = z.infer<typeof clinicianPatientSearchSchema>;
