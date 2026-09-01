import { z } from 'zod';

export const patientFormSchema = z.object({
  fullName: z.string().trim().min(2, 'Full name is required').max(150),
  nik: z.string().trim().refine((value) => !value || /^\d{16}$/.test(value), 'NIK must contain 16 digits'),
  dateOfBirth: z.string().min(1, 'Date of birth is required').refine((value) => new Date(`${value}T00:00:00`) <= new Date(), 'Date cannot be in the future'),
  gender: z.enum(['MALE','FEMALE','OTHER']), phone: z.string().trim().min(8, 'Enter a valid phone number').max(30),
  email: z.string().trim().refine((value) => !value || z.string().email().safeParse(value).success, 'Enter a valid email'),
  address: z.string().trim().min(5, 'Address is required').max(500),
  bloodType: z.string(), emergencyContactName: z.string().trim().max(150), emergencyContactPhone: z.string().trim().max(30),
  emergencyContactRelationship: z.string(), paymentType: z.enum(['SELF_PAY','INSURANCE','COMPANY','OTHER']), insuranceProvider: z.string().trim().max(150), insuranceMemberNumber: z.string().trim().max(100), status: z.enum(['ACTIVE','INACTIVE']),
  systolicBloodPressure: z.number().int().min(40, 'Enter 40–300').max(300, 'Enter 40–300'),
  diastolicBloodPressure: z.number().int().min(20, 'Enter 20–200').max(200, 'Enter 20–200'),
  weightKg: z.number().positive('Weight is required').max(500), heightCm: z.number().positive('Height is required').max(250),
});
export type PatientFormValues = z.infer<typeof patientFormSchema>;

export const measurementSchema = z.object({
  systolicBloodPressure:z.number().int().min(40).max(300), diastolicBloodPressure:z.number().int().min(20).max(200),
  weightKg:z.number().positive().max(500), heightCm:z.number().positive().max(250),
  temperature:z.union([z.literal(''),z.number().min(30).max(45)]), heartRate:z.union([z.literal(''),z.number().int().min(20).max(250)]),
  respiratoryRate:z.union([z.literal(''),z.number().int().min(5).max(80)]), oxygenSaturation:z.union([z.literal(''),z.number().int().min(0).max(100)]),
});
export type MeasurementFormValues=z.infer<typeof measurementSchema>;
