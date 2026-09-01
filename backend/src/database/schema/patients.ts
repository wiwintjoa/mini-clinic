import { sql } from 'drizzle-orm';
import { check, date, index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const patientGender = pgEnum('patient_gender', ['MALE', 'FEMALE', 'OTHER']);
export const patientStatus = pgEnum('patient_status', ['ACTIVE', 'INACTIVE']);
export const bloodType = pgEnum('blood_type', ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A', 'B', 'AB', 'O', 'UNKNOWN']);

export const mrnCounters = pgTable('mrn_counters', {
  clinicCode: text('clinic_code').primaryKey(),
  nextValue: integer('next_value').notNull().default(1),
}, (table) => [check('mrn_counters_positive_check', sql`${table.nextValue} > 0`)]);

export const patients = pgTable('patients', {
  id: uuid('id').primaryKey().defaultRandom(),
  mrn: text('mrn').notNull().unique(),
  fullName: text('full_name').notNull(),
  nik: text('nik'),
  dateOfBirth: date('date_of_birth', { mode: 'string' }).notNull(),
  gender: patientGender('gender').notNull(),
  phone: text('phone').notNull(),
  email: text('email'),
  address: text('address').notNull(),
  bloodType: bloodType('blood_type'),
  emergencyContactName: text('emergency_contact_name'),
  emergencyContactPhone: text('emergency_contact_phone'),
  emergencyContactRelationship: text('emergency_contact_relationship'),
  paymentType: text('payment_type').notNull().default('SELF_PAY'),
  insuranceProvider: text('insurance_provider'),
  insuranceMemberNumber: text('insurance_member_number'),
  insurance: text('insurance'),
  allergies: text('allergies'),
  status: patientStatus('status').notNull().default('ACTIVE'),
  portalUserId: uuid('portal_user_id'),
  registeredAt: timestamp('registered_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  uniqueIndex('patients_nik_uidx').on(table.nik).where(sql`${table.nik} IS NOT NULL`),
  uniqueIndex('patients_portal_user_uidx').on(table.portalUserId).where(sql`${table.portalUserId} IS NOT NULL`),
  index('patients_name_idx').on(table.fullName),
  index('patients_phone_idx').on(table.phone),
  index('patients_status_idx').on(table.status),
]);

export const patientVitalSigns = pgTable('patient_vital_signs', {
  id: uuid('id').primaryKey().defaultRandom(),
  patientId: uuid('patient_id').notNull(),
  visitId: uuid('visit_id'),
  systolicBloodPressure: integer('systolic_blood_pressure').notNull(),
  diastolicBloodPressure: integer('diastolic_blood_pressure').notNull(),
  weightKg: numeric('weight_kg', { precision: 6, scale: 2 }).notNull(),
  heightCm: numeric('height_cm', { precision: 5, scale: 2 }).notNull(),
  temperature: numeric('temperature', { precision: 4, scale: 1 }),
  heartRate: integer('heart_rate'),
  respiratoryRate: integer('respiratory_rate'),
  oxygenSaturation: integer('oxygen_saturation'),
  measuredAt: timestamp('measured_at', { withTimezone: true }).notNull().defaultNow(),
  measuredBy: uuid('measured_by').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('patient_vital_signs_patient_idx').on(table.patientId),
  index('patient_vital_signs_patient_measured_idx').on(table.patientId, table.measuredAt),
  index('patient_vital_signs_visit_idx').on(table.visitId),
]);

export type PatientRecord = typeof patients.$inferSelect;
export type NewPatientRecord = typeof patients.$inferInsert;
