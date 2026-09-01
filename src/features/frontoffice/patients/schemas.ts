import { z } from 'zod';

export const patientSchema = z.object({
  full_name: z.string().min(1, 'Full name is required').max(200),
  nik: z.string().max(32).optional().or(z.literal('')),
  date_of_birth: z.string().optional().or(z.literal('')),
  gender: z.enum(['MALE', 'FEMALE', 'OTHER']).optional(),
  phone: z.string().max(32).optional().or(z.literal('')),
  email: z.string().email('Invalid email').optional().or(z.literal('')),
  address: z.string().max(500).optional().or(z.literal('')),
  blood_type: z
    .enum(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'])
    .optional(),
  emergency_contact_name: z.string().max(200).optional().or(z.literal('')),
  emergency_contact_phone: z.string().max(32).optional().or(z.literal('')),
  insurance: z.string().max(100).optional().or(z.literal('')),
});

export type PatientFormValues = z.infer<typeof patientSchema>;
