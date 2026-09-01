import { z } from 'zod';

export const appointmentSchema = z.object({
  patient_id: z.string().min(1, 'Patient is required'),
  doctor_id: z.string().min(1, 'Doctor is required'),
  service_id: z.string().min(1, 'Service is required'),
  appointment_date: z.string().min(1, 'Date is required'),
  start_time: z.string().min(1, 'Start time is required'),
  notes: z.string().max(500).optional().or(z.literal('')),
});

export type AppointmentFormValues = z.infer<typeof appointmentSchema>;
