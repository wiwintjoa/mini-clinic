/*
# Seed Demo Users for Clinic Management System

## Overview
Creates the five demo staff accounts (admin, receptionist, doctor, pharmacist)
in auth.users and links them to the staff table with appropriate roles.
The patient demo account is not created here as patients use a separate table.

## What This Does
1. Inserts four auth.users records with hashed passwords (using crypt with bcrypt)
2. Inserts corresponding staff records linking to roles
3. Inserts a doctor record for the doctor user
4. All passwords are 'clinic123' (bcrypt hashed)

## Security Note
This is for development/demo purposes only. In production, users would be
created through proper signup flows.
*/

-- Create auth users with bcrypt-hashed passwords
-- Password for all: clinic123
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
SELECT
  gen_random_uuid(),
  email,
  crypt('clinic123', gen_salt('bf')),
  now(),
  now(),
  now(),
  'authenticated',
  'authenticated',
  '00000000-0000-0000-0000-000000000000'
FROM (VALUES
  ('admin@clinic.local'),
  ('receptionist@clinic.local'),
  ('doctor@clinic.local'),
  ('pharmacist@clinic.local')
) AS t(email)
WHERE NOT EXISTS (SELECT 1 FROM auth.users u WHERE u.email = t.email);

-- Link staff records to auth users
INSERT INTO staff (id, role_id, full_name, phone, email, is_active)
SELECT
  au.id,
  r.id,
  staff_data.full_name,
  staff_data.phone,
  au.email,
  true
FROM auth.users au
JOIN (VALUES
  ('admin@clinic.local', 'Admin User', '+1234567890'),
  ('receptionist@clinic.local', 'Jane Reception', '+1234567891'),
  ('doctor@clinic.local', 'Dr. John Smith', '+1234567892'),
  ('pharmacist@clinic.local', 'Pharmacist Lee', '+1234567893')
) AS staff_data(email, full_name, phone) ON staff_data.email = au.email
JOIN roles r ON (
  (staff_data.email = 'admin@clinic.local' AND r.name = 'ADMIN') OR
  (staff_data.email = 'receptionist@clinic.local' AND r.name = 'RECEPTIONIST') OR
  (staff_data.email = 'doctor@clinic.local' AND r.name = 'DOCTOR') OR
  (staff_data.email = 'pharmacist@clinic.local' AND r.name = 'PHARMACIST')
)
WHERE NOT EXISTS (SELECT 1 FROM staff s WHERE s.id = au.id);

-- Create doctor record for the doctor user
INSERT INTO doctors (id, specialty, license_number)
SELECT s.id, 'General Practice', 'LIC-001'
FROM staff s
JOIN roles r ON s.role_id = r.id
WHERE r.name = 'DOCTOR'
AND NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = s.id);
