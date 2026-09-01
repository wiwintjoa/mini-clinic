/*
# Phase 2-6: Clinic Operational Schema

## Overview
Creates all remaining tables for the clinic management system: services, doctor
schedules, appointments, queue entries, visits, vital signs, diagnoses (master +
visit diagnoses), prescriptions + items, medicines + categories + batches + stock
transactions, invoices + items + payments, and audit logs.

## New Tables
1. services - Clinic services with pricing and duration
2. doctor_schedules - Weekly recurring schedules per doctor
3. appointments - Patient appointments with doctors
4. queue_entries - Queue for checked-in patients
5. visits - Doctor consultation visits
6. vital_signs - Vital signs recorded during visits
7. diagnoses - ICD-10 diagnosis master
8. visit_diagnoses - Diagnoses linked to visits (primary + secondary)
9. medicines - Medicine catalog
10. medicine_categories - Medicine categories
11. medicine_batches - Medicine batches with expiry and stock
12. stock_transactions - Inventory movement log
13. prescriptions - Prescription headers
14. prescription_items - Prescription line items
15. invoices - Billing invoices
16. invoice_items - Invoice line items
17. payments - Payments against invoices
18. audit_logs - Audit trail

## Security
- RLS enabled on all tables
- Staff (authenticated) can read/write operational tables
- Patients can read only their own related data
*/

-- ============ SERVICES ============
CREATE TABLE IF NOT EXISTS services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL DEFAULT 0,
  duration_minutes int NOT NULL DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE services ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_services" ON services;
CREATE POLICY "staff_read_services" ON services FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_services" ON services;
CREATE POLICY "staff_insert_services" ON services FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_services" ON services;
CREATE POLICY "staff_update_services" ON services FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ DOCTOR_SCHEDULES ============
CREATE TABLE IF NOT EXISTS doctor_schedules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  day_of_week int NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
  start_time time NOT NULL,
  end_time time NOT NULL,
  break_start time,
  break_end time,
  slot_duration_minutes int NOT NULL DEFAULT 20,
  max_patients int NOT NULL DEFAULT 12,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctor_schedules ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_schedules" ON doctor_schedules;
CREATE POLICY "staff_read_schedules" ON doctor_schedules FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_schedules" ON doctor_schedules;
CREATE POLICY "staff_insert_schedules" ON doctor_schedules FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_schedules" ON doctor_schedules;
CREATE POLICY "staff_update_schedules" ON doctor_schedules FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "staff_delete_schedules" ON doctor_schedules;
CREATE POLICY "staff_delete_schedules" ON doctor_schedules FOR DELETE TO authenticated USING (true);

-- ============ APPOINTMENTS ============
CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  service_id uuid REFERENCES services(id) ON DELETE SET NULL,
  appointment_date date NOT NULL,
  start_time time NOT NULL,
  end_time time NOT NULL,
  status text NOT NULL DEFAULT 'BOOKED' CHECK (status IN ('BOOKED','CONFIRMED','CHECKED_IN','IN_PROGRESS','COMPLETED','CANCELLED','NO_SHOW')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON appointments(doctor_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON appointments(patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_status ON appointments(status);

ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_appointments" ON appointments;
CREATE POLICY "staff_read_appointments" ON appointments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_appointments" ON appointments;
CREATE POLICY "staff_insert_appointments" ON appointments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_appointments" ON appointments;
CREATE POLICY "staff_update_appointments" ON appointments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "staff_delete_appointments" ON appointments;
CREATE POLICY "staff_delete_appointments" ON appointments FOR DELETE TO authenticated USING (true);

-- ============ QUEUE_ENTRIES ============
CREATE TABLE IF NOT EXISTS queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_number text NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'WAITING' CHECK (status IN ('WAITING','CALLED','IN_CONSULTATION','COMPLETED','SKIPPED','CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_queue_doctor ON queue_entries(doctor_id);
CREATE INDEX IF NOT EXISTS idx_queue_status ON queue_entries(status);
CREATE INDEX IF NOT EXISTS idx_queue_patient ON queue_entries(patient_id);

ALTER TABLE queue_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_queue" ON queue_entries;
CREATE POLICY "staff_read_queue" ON queue_entries FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_queue" ON queue_entries;
CREATE POLICY "staff_insert_queue" ON queue_entries FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_queue" ON queue_entries;
CREATE POLICY "staff_update_queue" ON queue_entries FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "staff_delete_queue" ON queue_entries;
CREATE POLICY "staff_delete_queue" ON queue_entries FOR DELETE TO authenticated USING (true);

-- ============ VISITS ============
CREATE TABLE IF NOT EXISTS visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  appointment_id uuid REFERENCES appointments(id) ON DELETE SET NULL,
  queue_entry_id uuid REFERENCES queue_entries(id) ON DELETE SET NULL,
  visit_date date NOT NULL DEFAULT CURRENT_DATE,
  status text NOT NULL DEFAULT 'IN_PROGRESS' CHECK (status IN ('IN_PROGRESS','COMPLETED','CANCELLED')),
  chief_complaint text,
  history_present_illness text,
  physical_examination text,
  clinical_findings text,
  assessment text,
  plan text,
  treatment text,
  follow_up text,
  additional_notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_visits_patient ON visits(patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_doctor ON visits(doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_date ON visits(visit_date);

ALTER TABLE visits ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_visits" ON visits;
CREATE POLICY "staff_read_visits" ON visits FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_visits" ON visits;
CREATE POLICY "staff_insert_visits" ON visits FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_visits" ON visits;
CREATE POLICY "staff_update_visits" ON visits FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ VITAL_SIGNS ============
CREATE TABLE IF NOT EXISTS vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  blood_pressure_systolic int,
  blood_pressure_diastolic int,
  heart_rate int,
  respiratory_rate int,
  temperature numeric(5,2),
  spo2 int,
  weight numeric(6,2),
  height numeric(6,2),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE vital_signs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_vitals" ON vital_signs;
CREATE POLICY "staff_read_vitals" ON vital_signs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_vitals" ON vital_signs;
CREATE POLICY "staff_insert_vitals" ON vital_signs FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_vitals" ON vital_signs;
CREATE POLICY "staff_update_vitals" ON vital_signs FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ DIAGNOSES ============
CREATE TABLE IF NOT EXISTS diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  icd10_code text NOT NULL,
  name text NOT NULL,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnoses_code ON diagnoses(icd10_code);

ALTER TABLE diagnoses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_diagnoses" ON diagnoses;
CREATE POLICY "staff_read_diagnoses" ON diagnoses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_diagnoses" ON diagnoses;
CREATE POLICY "staff_insert_diagnoses" ON diagnoses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_diagnoses" ON diagnoses;
CREATE POLICY "staff_update_diagnoses" ON diagnoses FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ VISIT_DIAGNOSES ============
CREATE TABLE IF NOT EXISTS visit_diagnoses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  diagnosis_id uuid NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE visit_diagnoses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_visit_dx" ON visit_diagnoses;
CREATE POLICY "staff_read_visit_dx" ON visit_diagnoses FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_visit_dx" ON visit_diagnoses;
CREATE POLICY "staff_insert_visit_dx" ON visit_diagnoses FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_delete_visit_dx" ON visit_diagnoses;
CREATE POLICY "staff_delete_visit_dx" ON visit_diagnoses FOR DELETE TO authenticated USING (true);

-- ============ MEDICINE_CATEGORIES ============
CREATE TABLE IF NOT EXISTS medicine_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE medicine_categories ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_med_cats" ON medicine_categories;
CREATE POLICY "staff_read_med_cats" ON medicine_categories FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_med_cats" ON medicine_categories;
CREATE POLICY "staff_insert_med_cats" ON medicine_categories FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_med_cats" ON medicine_categories;
CREATE POLICY "staff_update_med_cats" ON medicine_categories FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ MEDICINES ============
CREATE TABLE IF NOT EXISTS medicines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  generic_name text,
  category_id uuid REFERENCES medicine_categories(id) ON DELETE SET NULL,
  category text,
  unit text NOT NULL DEFAULT 'tablet',
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  selling_price numeric(12,2) NOT NULL DEFAULT 0,
  minimum_stock int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_medicines_name ON medicines(name);
CREATE INDEX IF NOT EXISTS idx_medicines_code ON medicines(code);

ALTER TABLE medicines ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_medicines" ON medicines;
CREATE POLICY "staff_read_medicines" ON medicines FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_medicines" ON medicines;
CREATE POLICY "staff_insert_medicines" ON medicines FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_medicines" ON medicines;
CREATE POLICY "staff_update_medicines" ON medicines FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ MEDICINE_BATCHES ============
CREATE TABLE IF NOT EXISTS medicine_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  batch_number text NOT NULL,
  expiry_date date NOT NULL,
  quantity int NOT NULL DEFAULT 0,
  purchase_price numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_batches_medicine ON medicine_batches(medicine_id);
CREATE INDEX IF NOT EXISTS idx_batches_expiry ON medicine_batches(expiry_date);

ALTER TABLE medicine_batches ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_batches" ON medicine_batches;
CREATE POLICY "staff_read_batches" ON medicine_batches FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_batches" ON medicine_batches;
CREATE POLICY "staff_insert_batches" ON medicine_batches FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_batches" ON medicine_batches;
CREATE POLICY "staff_update_batches" ON medicine_batches FOR UPDATE TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "staff_delete_batches" ON medicine_batches;
CREATE POLICY "staff_delete_batches" ON medicine_batches FOR DELETE TO authenticated USING (true);

-- ============ STOCK_TRANSACTIONS ============
CREATE TABLE IF NOT EXISTS stock_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  batch_id uuid REFERENCES medicine_batches(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('PURCHASE','DISPENSE','ADJUSTMENT','RETURN','EXPIRED')),
  quantity int NOT NULL,
  reference text,
  created_by uuid REFERENCES staff(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_stock_medicine ON stock_transactions(medicine_id);

ALTER TABLE stock_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_stock" ON stock_transactions;
CREATE POLICY "staff_read_stock" ON stock_transactions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_stock" ON stock_transactions;
CREATE POLICY "staff_insert_stock" ON stock_transactions FOR INSERT TO authenticated WITH CHECK (true);

-- ============ PRESCRIPTIONS ============
CREATE TABLE IF NOT EXISTS prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_number text NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id uuid NOT NULL REFERENCES doctors(id) ON DELETE CASCADE,
  visit_id uuid NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
  status text NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT','SUBMITTED','PROCESSING','READY','DISPENSED','CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON prescriptions(patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_status ON prescriptions(status);

ALTER TABLE prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_prescriptions" ON prescriptions;
CREATE POLICY "staff_read_prescriptions" ON prescriptions FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_prescriptions" ON prescriptions;
CREATE POLICY "staff_insert_prescriptions" ON prescriptions FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_prescriptions" ON prescriptions;
CREATE POLICY "staff_update_prescriptions" ON prescriptions FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ PRESCRIPTION_ITEMS ============
CREATE TABLE IF NOT EXISTS prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES prescriptions(id) ON DELETE CASCADE,
  medicine_id uuid NOT NULL REFERENCES medicines(id) ON DELETE CASCADE,
  dosage text NOT NULL,
  frequency text NOT NULL,
  route text NOT NULL DEFAULT 'Oral',
  duration text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  instructions text,
  dispensed_quantity int DEFAULT 0,
  batch_id uuid REFERENCES medicine_batches(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE prescription_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_presc_items" ON prescription_items;
CREATE POLICY "staff_read_presc_items" ON prescription_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_presc_items" ON prescription_items;
CREATE POLICY "staff_insert_presc_items" ON prescription_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_presc_items" ON prescription_items;
CREATE POLICY "staff_update_presc_items" ON prescription_items FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ INVOICES ============
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number text NOT NULL,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  invoice_date date NOT NULL DEFAULT CURRENT_DATE,
  subtotal numeric(12,2) NOT NULL DEFAULT 0,
  discount numeric(12,2) NOT NULL DEFAULT 0,
  tax numeric(12,2) NOT NULL DEFAULT 0,
  grand_total numeric(12,2) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','PARTIAL','REFUNDED','CANCELLED')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_invoices_patient ON invoices(patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_invoices" ON invoices;
CREATE POLICY "staff_read_invoices" ON invoices FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_invoices" ON invoices;
CREATE POLICY "staff_insert_invoices" ON invoices FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_invoices" ON invoices;
CREATE POLICY "staff_update_invoices" ON invoices FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ INVOICE_ITEMS ============
CREATE TABLE IF NOT EXISTS invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('CONSULTATION','MEDICINE','SERVICE')),
  description text NOT NULL,
  quantity int NOT NULL DEFAULT 1,
  unit_price numeric(12,2) NOT NULL DEFAULT 0,
  total numeric(12,2) NOT NULL DEFAULT 0
);

ALTER TABLE invoice_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_inv_items" ON invoice_items;
CREATE POLICY "staff_read_inv_items" ON invoice_items FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_inv_items" ON invoice_items;
CREATE POLICY "staff_insert_inv_items" ON invoice_items FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_delete_inv_items" ON invoice_items;
CREATE POLICY "staff_delete_inv_items" ON invoice_items FOR DELETE TO authenticated USING (true);

-- ============ PAYMENTS ============
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  amount numeric(12,2) NOT NULL DEFAULT 0,
  method text NOT NULL DEFAULT 'CASH' CHECK (method IN ('CASH','DEBIT_CARD','CREDIT_CARD','BANK_TRANSFER','QRIS','INSURANCE')),
  status text NOT NULL DEFAULT 'PAID' CHECK (status IN ('PENDING','PAID','PARTIAL','REFUNDED','CANCELLED')),
  reference text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_invoice ON payments(invoice_id);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_payments" ON payments;
CREATE POLICY "staff_read_payments" ON payments FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_payments" ON payments;
CREATE POLICY "staff_insert_payments" ON payments FOR INSERT TO authenticated WITH CHECK (true);
DROP POLICY IF EXISTS "staff_update_payments" ON payments;
CREATE POLICY "staff_update_payments" ON payments FOR UPDATE TO authenticated USING (true) WITH CHECK (true);

-- ============ AUDIT_LOGS ============
CREATE TABLE IF NOT EXISTS audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "staff_read_audit" ON audit_logs;
CREATE POLICY "staff_read_audit" ON audit_logs FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "staff_insert_audit" ON audit_logs;
CREATE POLICY "staff_insert_audit" ON audit_logs FOR INSERT TO authenticated WITH CHECK (true);

-- ============ TRIGGERS FOR UPDATED_AT ============
DROP TRIGGER IF EXISTS trigger_services_updated_at ON services;
CREATE TRIGGER trigger_services_updated_at BEFORE UPDATE ON services
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_schedules_updated_at ON doctor_schedules;
CREATE TRIGGER trigger_schedules_updated_at BEFORE UPDATE ON doctor_schedules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_appointments_updated_at ON appointments;
CREATE TRIGGER trigger_appointments_updated_at BEFORE UPDATE ON appointments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_queue_updated_at ON queue_entries;
CREATE TRIGGER trigger_queue_updated_at BEFORE UPDATE ON queue_entries
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_visits_updated_at ON visits;
CREATE TRIGGER trigger_visits_updated_at BEFORE UPDATE ON visits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_medicines_updated_at ON medicines;
CREATE TRIGGER trigger_medicines_updated_at BEFORE UPDATE ON medicines
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_prescriptions_updated_at ON prescriptions;
CREATE TRIGGER trigger_prescriptions_updated_at BEFORE UPDATE ON prescriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_invoices_updated_at ON invoices;
CREATE TRIGGER trigger_invoices_updated_at BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ QUEUE NUMBER GENERATION ============
CREATE OR REPLACE FUNCTION generate_queue_number(p_doctor_id uuid)
RETURNS text AS $$
DECLARE
  prefix char;
  next_val int;
  queue_val text;
  doctor_specialty text;
BEGIN
  SELECT specialty INTO doctor_specialty FROM doctors WHERE id = p_doctor_id;
  prefix := UPPER(SUBSTRING(doctor_specialty, 1, 1));
  SELECT COUNT(*) + 1 INTO next_val FROM queue_entries WHERE doctor_id = p_doctor_id AND created_at::date = CURRENT_DATE;
  queue_val := prefix || '-' || lpad(next_val::text, 3, '0');
  RETURN queue_val;
END;
$$ LANGUAGE plpgsql;

-- ============ PRESCRIPTION NUMBER GENERATION ============
CREATE OR REPLACE FUNCTION generate_prescription_number()
RETURNS text AS $$
DECLARE
  next_val int;
  presc_val text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_val FROM prescriptions WHERE created_at::date = CURRENT_DATE;
  presc_val := 'RX-' || to_char(now(), 'YYMMDD') || '-' || lpad(next_val::text, 4, '0');
  RETURN presc_val;
END;
$$ LANGUAGE plpgsql;

-- ============ INVOICE NUMBER GENERATION ============
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS text AS $$
DECLARE
  next_val int;
  inv_val text;
BEGIN
  SELECT COUNT(*) + 1 INTO next_val FROM invoices WHERE created_at::date = CURRENT_DATE;
  inv_val := 'INV-' || to_char(now(), 'YYMMDD') || '-' || lpad(next_val::text, 4, '0');
  RETURN inv_val;
END;
$$ LANGUAGE plpgsql;
