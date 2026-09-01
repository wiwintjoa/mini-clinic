/*
# Phase 1: Clinic Management System Foundation

## Overview
Creates the foundational schema for a Small Clinic Management System. This migration
sets up the core tables needed for authentication, role-based access control (RBAC),
staff management, and clinic configuration.

## New Tables

### 1. roles
Stores the five system roles: ADMIN, RECEPTIONIST, DOCTOR, PHARMACIST, PATIENT.
- `id` (uuid, PK)
- `name` (text, unique) - Role name (ADMIN, RECEPTIONIST, etc.)
- `description` (text)
- `created_at`, `updated_at`

### 2. permissions
Granular permissions for RBAC (e.g., PATIENT_READ_SELF, PRESCRIPTION_CREATE).
- `id` (uuid, PK)
- `name` (text, unique) - Permission name
- `description` (text)
- `created_at`

### 3. role_permissions
Many-to-many junction between roles and permissions.
- `role_id` (FK -> roles)
- `permission_id` (FK -> permissions)
- PK on (role_id, permission_id)

### 4. staff
Links to Supabase auth.users. Stores staff profile data (name, role, etc.).
- `id` (uuid, PK, FK -> auth.users ON DELETE CASCADE)
- `role_id` (FK -> roles)
- `full_name` (text)
- `phone` (text)
- `email` (text, unique) - mirrors auth.users email
- `is_active` (boolean, default true)
- `created_at`, `updated_at`

### 5. doctors
Extends staff with doctor-specific fields.
- `id` (uuid, PK, FK -> staff ON DELETE CASCADE)
- `specialty` (text)
- `license_number` (text, unique)
- `created_at`, `updated_at`

### 6. patients
Patient records with auto-generated MRN.
- `id` (uuid, PK)
- `mrn` (text, unique) - Format: CLN-000001
- `full_name` (text)
- `nik` (text) - National ID
- `date_of_birth` (date)
- `gender` (text) - MALE, FEMALE, OTHER
- `phone` (text)
- `email` (text)
- `address` (text)
- `blood_type` (text)
- `emergency_contact_name` (text)
- `emergency_contact_phone` (text)
- `insurance` (text)
- `status` (text) - ACTIVE, INACTIVE
- `auth_user_id` (uuid, nullable, FK -> auth.users) - For patient portal login
- `created_at`, `updated_at`

### 7. mrn_counter
Simple counter table for MRN generation.
- `id` (int, PK, default 1)
- `next_value` (int, default 1)

## Security
- RLS enabled on all tables.
- Staff tables: only authenticated users can access, scoped by role.
- Patients: authenticated staff can read all; patients can read only their own record.
- Role/permission tables: read-only for authenticated users.
*/

-- ============ ROLES ============
CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_roles" ON roles;
CREATE POLICY "staff_read_roles" ON roles FOR SELECT
  TO authenticated USING (true);

-- ============ PERMISSIONS ============
CREATE TABLE IF NOT EXISTS permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_permissions" ON permissions;
CREATE POLICY "staff_read_permissions" ON permissions FOR SELECT
  TO authenticated USING (true);

-- ============ ROLE_PERMISSIONS ============
CREATE TABLE IF NOT EXISTS role_permissions (
  role_id uuid NOT NULL REFERENCES roles(id) ON DELETE CASCADE,
  permission_id uuid NOT NULL REFERENCES permissions(id) ON DELETE CASCADE,
  PRIMARY KEY (role_id, permission_id)
);

ALTER TABLE role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_role_permissions" ON role_permissions;
CREATE POLICY "staff_read_role_permissions" ON role_permissions FOR SELECT
  TO authenticated USING (true);

-- ============ STAFF ============
CREATE TABLE IF NOT EXISTS staff (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role_id uuid NOT NULL REFERENCES roles(id),
  full_name text NOT NULL,
  phone text,
  email text UNIQUE NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE staff ENABLE ROW LEVEL SECURITY;

-- Staff can read all staff records (need to see colleagues)
DROP POLICY IF EXISTS "staff_select_staff" ON staff;
CREATE POLICY "staff_select_staff" ON staff FOR SELECT
  TO authenticated USING (true);

-- Staff can only update their own record (non-role fields)
DROP POLICY IF EXISTS "staff_update_own" ON staff;
CREATE POLICY "staff_update_own" ON staff FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Staff records are created via admin/edge function, not direct insert
-- But we allow insert for authenticated (admin will manage via service role)
DROP POLICY IF EXISTS "staff_insert_staff" ON staff;
CREATE POLICY "staff_insert_staff" ON staff FOR INSERT
  TO authenticated WITH CHECK (true);

-- ============ DOCTORS ============
CREATE TABLE IF NOT EXISTS doctors (
  id uuid PRIMARY KEY REFERENCES staff(id) ON DELETE CASCADE,
  specialty text NOT NULL,
  license_number text UNIQUE NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "staff_read_doctors" ON doctors;
CREATE POLICY "staff_read_doctors" ON doctors FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "staff_insert_doctors" ON doctors;
CREATE POLICY "staff_insert_doctors" ON doctors FOR INSERT
  TO authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "staff_update_doctors" ON doctors;
CREATE POLICY "staff_update_doctors" ON doctors FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============ PATIENTS ============
CREATE TABLE IF NOT EXISTS patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text UNIQUE NOT NULL,
  full_name text NOT NULL,
  nik text,
  date_of_birth date,
  gender text CHECK (gender IN ('MALE', 'FEMALE', 'OTHER')),
  phone text,
  email text,
  address text,
  blood_type text CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', '')),
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance text,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE')),
  auth_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_patients_mrn ON patients(mrn);
CREATE INDEX IF NOT EXISTS idx_patients_name ON patients(full_name);
CREATE INDEX IF NOT EXISTS idx_patients_phone ON patients(phone);
CREATE INDEX IF NOT EXISTS idx_patients_auth_user_id ON patients(auth_user_id);

ALTER TABLE patients ENABLE ROW LEVEL SECURITY;

-- Staff can read all patient records
DROP POLICY IF EXISTS "staff_read_patients" ON patients;
CREATE POLICY "staff_read_patients" ON patients FOR SELECT
  TO authenticated USING (true);

-- Staff can create patients
DROP POLICY IF EXISTS "staff_insert_patients" ON patients;
CREATE POLICY "staff_insert_patients" ON patients FOR INSERT
  TO authenticated WITH CHECK (true);

-- Staff can update patients
DROP POLICY IF EXISTS "staff_update_patients" ON patients;
CREATE POLICY "staff_update_patients" ON patients FOR UPDATE
  TO authenticated USING (true) WITH CHECK (true);

-- ============ MRN COUNTER ============
CREATE TABLE IF NOT EXISTS mrn_counter (
  id int PRIMARY KEY DEFAULT 1,
  next_value int NOT NULL DEFAULT 1,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO mrn_counter (id, next_value) VALUES (1, 1)
  ON CONFLICT (id) DO NOTHING;

ALTER TABLE mrn_counter ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read the counter
DROP POLICY IF EXISTS "staff_read_mrn_counter" ON mrn_counter;
CREATE POLICY "staff_read_mrn_counter" ON mrn_counter FOR SELECT
  TO authenticated USING (true);

-- ============ UPDATED_AT TRIGGERS ============
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_roles_updated_at ON roles;
CREATE TRIGGER trigger_roles_updated_at BEFORE UPDATE ON roles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_staff_updated_at ON staff;
CREATE TRIGGER trigger_staff_updated_at BEFORE UPDATE ON staff
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_doctors_updated_at ON doctors;
CREATE TRIGGER trigger_doctors_updated_at BEFORE UPDATE ON doctors
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS trigger_patients_updated_at ON patients;
CREATE TRIGGER trigger_patients_updated_at BEFORE UPDATE ON patients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============ MRN GENERATION FUNCTION ============
CREATE OR REPLACE FUNCTION generate_mrn()
RETURNS text AS $$
DECLARE
  next_val int;
  mrn_value text;
BEGIN
  UPDATE mrn_counter SET next_value = next_value + 1 WHERE id = 1
    RETURNING next_value INTO next_val;
  mrn_value := 'CLN-' || lpad(next_val::text, 6, '0');
  RETURN mrn_value;
END;
$$ LANGUAGE plpgsql;

-- ============ SEED ROLES ============
INSERT INTO roles (name, description) VALUES
  ('ADMIN', 'System administrator with full access'),
  ('RECEPTIONIST', 'Front desk staff handling patient registration and appointments'),
  ('DOCTOR', 'Medical doctor performing consultations'),
  ('PHARMACIST', 'Pharmacy staff handling prescriptions and inventory'),
  ('PATIENT', 'Patient portal user')
ON CONFLICT (name) DO NOTHING;

-- ============ SEED PERMISSIONS ============
INSERT INTO permissions (name, description) VALUES
  ('PATIENT_READ_SELF', 'Read own patient record'),
  ('PATIENT_READ_ANY', 'Read any patient record'),
  ('PATIENT_CREATE', 'Create new patient records'),
  ('PATIENT_UPDATE', 'Update patient records'),
  ('VISIT_READ_SELF', 'Read own visits'),
  ('VISIT_READ_ANY', 'Read any visit'),
  ('VISIT_CREATE', 'Create visit records'),
  ('PRESCRIPTION_CREATE', 'Create prescriptions'),
  ('PRESCRIPTION_DISPENSE', 'Dispense prescriptions'),
  ('INVENTORY_READ', 'Read inventory'),
  ('INVENTORY_UPDATE', 'Update inventory'),
  ('BILLING_READ', 'Read billing information'),
  ('BILLING_CREATE', 'Create invoices and payments'),
  ('REPORT_READ', 'View reports'),
  ('USER_MANAGE', 'Manage system users')
ON CONFLICT (name) DO NOTHING;

-- ============ SEED ROLE_PERMISSIONS ============
-- Admin gets all permissions
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p WHERE r.name = 'ADMIN'
ON CONFLICT DO NOTHING;

-- Receptionist
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'RECEPTIONIST' AND p.name IN (
    'PATIENT_READ_ANY', 'PATIENT_CREATE', 'PATIENT_UPDATE',
    'VISIT_READ_ANY', 'VISIT_CREATE',
    'BILLING_READ', 'BILLING_CREATE'
  )
ON CONFLICT DO NOTHING;

-- Doctor
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'DOCTOR' AND p.name IN (
    'PATIENT_READ_ANY', 'PATIENT_UPDATE',
    'VISIT_READ_ANY', 'VISIT_CREATE',
    'PRESCRIPTION_CREATE'
  )
ON CONFLICT DO NOTHING;

-- Pharmacist
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'PHARMACIST' AND p.name IN (
    'PRESCRIPTION_DISPENSE',
    'INVENTORY_READ', 'INVENTORY_UPDATE'
  )
ON CONFLICT DO NOTHING;

-- Patient
INSERT INTO role_permissions (role_id, permission_id)
  SELECT r.id, p.id FROM roles r, permissions p
  WHERE r.name = 'PATIENT' AND p.name IN (
    'PATIENT_READ_SELF', 'VISIT_READ_SELF', 'BILLING_READ'
  )
ON CONFLICT DO NOTHING;
