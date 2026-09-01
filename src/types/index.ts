export type RoleName = 'ADMIN' | 'RECEPTIONIST' | 'DOCTOR' | 'PHARMACIST' | 'PATIENT';

export type Gender = 'MALE' | 'FEMALE' | 'OTHER';

export type BloodType = 'A+' | 'A-' | 'B+' | 'B-' | 'AB+' | 'AB-' | 'O+' | 'O-';

export type PatientStatus = 'ACTIVE' | 'INACTIVE';

export type AppointmentStatus =
  | 'BOOKED'
  | 'CONFIRMED'
  | 'CHECKED_IN'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'NO_SHOW';

export type QueueStatus =
  | 'WAITING'
  | 'CALLED'
  | 'IN_CONSULTATION'
  | 'COMPLETED'
  | 'SKIPPED'
  | 'CANCELLED';

export type PrescriptionStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'PROCESSING'
  | 'READY'
  | 'DISPENSED'
  | 'CANCELLED';

export type InvoiceStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED' | 'CANCELLED';

export type PaymentMethod =
  | 'CASH'
  | 'DEBIT_CARD'
  | 'CREDIT_CARD'
  | 'BANK_TRANSFER'
  | 'QRIS'
  | 'INSURANCE';

export type PaymentStatus = 'PENDING' | 'PAID' | 'PARTIAL' | 'REFUNDED' | 'CANCELLED';

export type StockTransactionType =
  | 'PURCHASE'
  | 'DISPENSE'
  | 'ADJUSTMENT'
  | 'RETURN'
  | 'EXPIRED';

export interface Role {
  id: string;
  name: RoleName;
  description: string | null;
  created_at: string;
}

export interface Permission {
  id: string;
  name: string;
  description: string | null;
}

export interface Staff {
  id: string;
  role_id: string;
  full_name: string;
  phone: string | null;
  email: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  role?: Role;
}

export interface Doctor {
  id: string;
  specialty: string;
  license_number: string;
  created_at: string;
  updated_at: string;
  staff?: Staff;
}

export interface Patient {
  id: string;
  mrn: string;
  full_name: string;
  nik: string | null;
  date_of_birth: string | null;
  gender: Gender | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  blood_type: BloodType | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  insurance: string | null;
  status: PatientStatus;
  auth_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DoctorSchedule {
  id: string;
  doctor_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  break_start: string | null;
  break_end: string | null;
  slot_duration_minutes: number;
  max_patients: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: string;
  patient_id: string;
  doctor_id: string;
  service_id: string | null;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
  service?: Service;
}

export interface QueueEntry {
  id: string;
  queue_number: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  status: QueueStatus;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface Visit {
  id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  queue_entry_id: string | null;
  visit_date: string;
  status: string;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
}

export interface VitalSigns {
  id: string;
  visit_id: string;
  blood_pressure_systolic: number | null;
  blood_pressure_diastolic: number | null;
  heart_rate: number | null;
  respiratory_rate: number | null;
  temperature: number | null;
  spo2: number | null;
  weight: number | null;
  height: number | null;
  created_at: string;
}

export interface Diagnosis {
  id: string;
  icd10_code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
}

export interface VisitDiagnosis {
  id: string;
  visit_id: string;
  diagnosis_id: string;
  is_primary: boolean;
  notes: string | null;
  diagnosis?: Diagnosis;
}

export interface Medicine {
  id: string;
  code: string;
  name: string;
  generic_name: string | null;
  category: string | null;
  unit: string;
  purchase_price: number;
  selling_price: number;
  minimum_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface MedicineBatch {
  id: string;
  medicine_id: string;
  batch_number: string;
  expiry_date: string;
  quantity: number;
  purchase_price: number;
  created_at: string;
  medicine?: Medicine;
}

export interface Prescription {
  id: string;
  prescription_number: string;
  patient_id: string;
  doctor_id: string;
  visit_id: string;
  status: PrescriptionStatus;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  doctor?: Doctor;
  prescription_items?: PrescriptionItem[];
}

export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medicine_id: string;
  dosage: string;
  frequency: string;
  route: string;
  duration: string;
  quantity: number;
  instructions: string | null;
  medicine?: Medicine;
}

export interface Invoice {
  id: string;
  invoice_number: string;
  patient_id: string;
  visit_id: string | null;
  invoice_date: string;
  subtotal: number;
  discount: number;
  tax: number;
  grand_total: number;
  status: InvoiceStatus;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  invoice_items?: InvoiceItem[];
  payments?: Payment[];
}

export interface InvoiceItem {
  id: string;
  invoice_id: string;
  item_type: string;
  description: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Payment {
  id: string;
  invoice_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference: string | null;
  created_at: string;
}

export interface StockTransaction {
  id: string;
  medicine_id: string;
  batch_id: string | null;
  type: StockTransactionType;
  quantity: number;
  reference: string | null;
  created_by: string | null;
  created_at: string;
  medicine?: Medicine;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  entity: string;
  entity_id: string | null;
  old_value: jsonb | null;
  new_value: jsonb | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

type jsonb = Record<string, unknown> | null;
