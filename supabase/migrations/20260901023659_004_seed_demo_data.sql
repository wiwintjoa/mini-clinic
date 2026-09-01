/*
# Seed Demo Data for Clinic Management System

## Overview
Populates the database with realistic demo data:
- 2 additional doctors (total 3)
- 6 clinic services
- 4 medicine categories
- 20 medicines
- Multiple medicine batches with stock
- 20 patients with MRNs
- Common ICD-10 diagnoses
- Doctor schedules
- Sample appointments for today
- Sample queue entries
- Sample prescriptions, invoices, and payments

## Notes
- All data is fictional - no real patient information
- MRNs are auto-generated: CLN-000001 through CLN-000020
*/

-- ============ ADDITIONAL DOCTORS ============
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
SELECT gen_random_uuid(), 'doctor2@clinic.local', crypt('clinic123', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'doctor2@clinic.local');

INSERT INTO staff (id, role_id, full_name, phone, email, is_active)
SELECT au.id, r.id, 'Dr. Sarah Chen', '+1234567894', 'doctor2@clinic.local', true
FROM auth.users au, roles r
WHERE au.email = 'doctor2@clinic.local' AND r.name = 'DOCTOR'
AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.email = 'doctor2@clinic.local');

INSERT INTO doctors (id, specialty, license_number)
SELECT s.id, 'Pediatrics', 'LIC-002'
FROM staff s WHERE s.email = 'doctor2@clinic.local'
AND NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = s.id);

INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, role, aud, instance_id)
SELECT gen_random_uuid(), 'doctor3@clinic.local', crypt('clinic123', gen_salt('bf')), now(), now(), now(), 'authenticated', 'authenticated', '00000000-0000-0000-0000-000000000000'
WHERE NOT EXISTS (SELECT 1 FROM auth.users WHERE email = 'doctor3@clinic.local');

INSERT INTO staff (id, role_id, full_name, phone, email, is_active)
SELECT au.id, r.id, 'Dr. Michael Brown', '+1234567895', 'doctor3@clinic.local', true
FROM auth.users au, roles r
WHERE au.email = 'doctor3@clinic.local' AND r.name = 'DOCTOR'
AND NOT EXISTS (SELECT 1 FROM staff s WHERE s.email = 'doctor3@clinic.local');

INSERT INTO doctors (id, specialty, license_number)
SELECT s.id, 'Cardiology', 'LIC-003'
FROM staff s WHERE s.email = 'doctor3@clinic.local'
AND NOT EXISTS (SELECT 1 FROM doctors d WHERE d.id = s.id);

-- ============ SERVICES ============
INSERT INTO services (name, description, price, duration_minutes, is_active) VALUES
  ('General Consultation', 'Standard doctor consultation', 150000, 20, true),
  ('Pediatric Consultation', 'Consultation for children', 200000, 30, true),
  ('Cardiology Consultation', 'Heart specialist consultation', 300000, 30, true),
  ('Follow-up Visit', 'Post-treatment follow-up', 75000, 15, true),
  ('Vaccination', 'Vaccination service', 100000, 10, true),
  ('Health Check-up', 'Routine health screening', 250000, 45, true)
ON CONFLICT DO NOTHING;

-- ============ MEDICINE CATEGORIES ============
INSERT INTO medicine_categories (name, description) VALUES
  ('Analgesics', 'Pain relief medications'),
  ('Antibiotics', 'Bacterial infection treatment'),
  ('Antihistamines', 'Allergy medications'),
  ('Gastrointestinal', 'Digestive system medications'),
  ('Cardiovascular', 'Heart and blood pressure medications'),
  ('Vitamins', 'Vitamin and mineral supplements')
ON CONFLICT (name) DO NOTHING;

-- ============ MEDICINES ============
INSERT INTO medicines (code, name, generic_name, category, unit, purchase_price, selling_price, minimum_stock, is_active) VALUES
  ('MED001', 'Paracetamol 500mg', 'Acetaminophen', 'Analgesics', 'tablet', 500, 1000, 50, true),
  ('MED002', 'Ibuprofen 400mg', 'Ibuprofen', 'Analgesics', 'tablet', 800, 1500, 30, true),
  ('MED003', 'Amoxicillin 500mg', 'Amoxicillin', 'Antibiotics', 'capsule', 1500, 3000, 20, true),
  ('MED004', 'Azithromycin 500mg', 'Azithromycin', 'Antibiotics', 'tablet', 3000, 5000, 15, true),
  ('MED005', 'Cetirizine 10mg', 'Cetirizine', 'Antihistamines', 'tablet', 300, 800, 25, true),
  ('MED006', 'Loratadine 10mg', 'Loratadine', 'Antihistamines', 'tablet', 350, 900, 25, true),
  ('MED007', 'Omeprazole 20mg', 'Omeprazole', 'Gastrointestinal', 'capsule', 1000, 2000, 20, true),
  ('MED008', 'Ranitidine 150mg', 'Ranitidine', 'Gastrointestinal', 'tablet', 500, 1200, 20, true),
  ('MED009', 'Amlodipine 5mg', 'Amlodipine', 'Cardiovascular', 'tablet', 800, 1800, 30, true),
  ('MED010', 'Atorvastatin 20mg', 'Atorvastatin', 'Cardiovascular', 'tablet', 2000, 3500, 20, true),
  ('MED011', 'Metformin 500mg', 'Metformin', 'Cardiovascular', 'tablet', 700, 1500, 40, true),
  ('MED012', 'Vitamin C 1000mg', 'Ascorbic Acid', 'Vitamins', 'tablet', 400, 1000, 50, true),
  ('MED013', 'Vitamin D3 1000IU', 'Cholecalciferol', 'Vitamins', 'capsule', 600, 1500, 30, true),
  ('MED014', 'Multivitamin', 'Multiple Vitamins', 'Vitamins', 'tablet', 800, 2000, 40, true),
  ('MED015', 'Cough Syrup 100ml', 'Dextromethorphan', 'Gastrointestinal', 'bottle', 5000, 9000, 10, true),
  ('MED016', 'ORS Sachet', 'Oral Rehydration Salts', 'Gastrointestinal', 'sachet', 1000, 2500, 30, true),
  ('MED017', 'Diclofenac 50mg', 'Diclofenac Sodium', 'Analgesics', 'tablet', 600, 1300, 25, true),
  ('MED018', 'Ciprofloxacin 500mg', 'Ciprofloxacin', 'Antibiotics', 'tablet', 2000, 3500, 15, true),
  ('MED019', 'Salbutamol Inhaler', 'Salbutamol', 'Antihistamines', 'inhaler', 15000, 25000, 10, true),
  ('MED020', 'Aspirin 100mg', 'Acetylsalicylic Acid', 'Cardiovascular', 'tablet', 300, 700, 50, true)
ON CONFLICT (code) DO NOTHING;

-- ============ MEDICINE BATCHES ============
INSERT INTO medicine_batches (medicine_id, batch_number, expiry_date, quantity, purchase_price)
SELECT m.id, 'BAT-' || m.code || '-01', '2027-06-30'::date,
  CASE
    WHEN m.minimum_stock >= 40 THEN 100
    WHEN m.minimum_stock >= 25 THEN 60
    ELSE 30
  END,
  m.purchase_price
FROM medicines m
WHERE NOT EXISTS (SELECT 1 FROM medicine_batches b WHERE b.medicine_id = m.id);

INSERT INTO medicine_batches (medicine_id, batch_number, expiry_date, quantity, purchase_price)
SELECT m.id, 'BAT-' || m.code || '-02', '2026-12-31'::date, 20, m.purchase_price
FROM medicines m
WHERE m.code IN ('MED001', 'MED003', 'MED007', 'MED009')
AND NOT EXISTS (SELECT 1 FROM medicine_batches b WHERE b.batch_number = 'BAT-' || m.code || '-02');

-- ============ STOCK TRANSACTIONS ============
INSERT INTO stock_transactions (medicine_id, batch_id, type, quantity, reference, created_by)
SELECT b.medicine_id, b.id, 'PURCHASE', b.quantity, 'Initial stock',
  (SELECT id FROM staff WHERE email = 'admin@clinic.local' LIMIT 1)
FROM medicine_batches b
WHERE NOT EXISTS (SELECT 1 FROM stock_transactions st WHERE st.batch_id = b.id);

-- ============ DIAGNOSES (ICD-10) ============
INSERT INTO diagnoses (icd10_code, name, description, is_active) VALUES
  ('J00', 'Acute nasopharyngitis [common cold]', 'Common cold', true),
  ('J01.0', 'Acute maxillary sinusitis', 'Sinus infection', true),
  ('J02.9', 'Acute pharyngitis, unspecified', 'Sore throat', true),
  ('J03.00', 'Acute streptococcal tonsillitis', 'Strep throat', true),
  ('J45.909', 'Unspecified asthma, uncomplicated', 'Asthma', true),
  ('K21.9', 'Gastro-esophageal reflux disease without esophagitis', 'GERD', true),
  ('K29.7', 'Gastritis, unspecified', 'Gastritis', true),
  ('I10', 'Essential (primary) hypertension', 'High blood pressure', true),
  ('I25.10', 'Atherosclerotic heart disease', 'Heart disease', true),
  ('E11.9', 'Type 2 diabetes mellitus, unspecified', 'Diabetes type 2', true),
  ('E78.5', 'Hyperlipidemia, unspecified', 'High cholesterol', true),
  ('M54.5', 'Low back pain', 'Lower back pain', true),
  ('M25.561', 'Pain in right knee', 'Knee pain', true),
  ('R51', 'Headache', 'Headache', true),
  ('R05.9', 'Cough, unspecified', 'Cough', true),
  ('L20.9', 'Atopic dermatitis, unspecified', 'Eczema', true),
  ('L23.9', 'Allergic contact dermatitis, unspecified', 'Skin allergy', true),
  ('A09', 'Diarrhea and gastroenteritis of presumed infectious origin', 'Diarrhea', true),
  ('N39.0', 'Urinary tract infection, site not specified', 'UTI', true),
  ('M79.1', 'Myalgia', 'Muscle pain', true),
  ('R10.9', 'Unspecified abdominal pain', 'Stomach pain', true),
  ('R50.9', 'Fever, unspecified', 'Fever', true),
  ('W19', 'Unspecified fall', 'Fall injury', true),
  ('S93.401A', 'Sprain of unspecified ankle', 'Ankle sprain', true)
ON CONFLICT DO NOTHING;

-- ============ DOCTOR SCHEDULES ============
DO $$
DECLARE
  d1 uuid; d2 uuid; d3 uuid;
BEGIN
  SELECT id INTO d1 FROM doctors WHERE license_number = 'LIC-001';
  SELECT id INTO d2 FROM doctors WHERE license_number = 'LIC-002';
  SELECT id INTO d3 FROM doctors WHERE license_number = 'LIC-003';

  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients)
  SELECT d1, n, '08:00', '12:00', 20, 12 FROM generate_series(1, 5) n
  ON CONFLICT DO NOTHING;

  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, slot_duration_minutes, max_patients)
  SELECT d2, n, '09:00', '13:00', 30, 8 FROM (VALUES (1),(2),(4),(5)) AS t(n)
  ON CONFLICT DO NOTHING;

  INSERT INTO doctor_schedules (doctor_id, day_of_week, start_time, end_time, break_start, break_end, slot_duration_minutes, max_patients)
  SELECT d3, n, '10:00', '15:00', '12:00', '13:00', 30, 10 FROM (VALUES (2),(3),(4)) AS t(n)
  ON CONFLICT DO NOTHING;
END $$;

-- ============ PATIENTS (20 patients) ============
INSERT INTO patients (mrn, full_name, nik, date_of_birth, gender, phone, email, address, blood_type, emergency_contact_name, emergency_contact_phone, insurance, status)
SELECT
  'CLN-' || lpad((row_number() OVER ())::text, 6, '0'),
  t.full_name, t.nik, t.dob::date, t.gender, t.phone, t.email, t.address, t.blood_type, t.emer_name, t.emer_phone, t.insurance, 'ACTIVE'
FROM (VALUES
  ('John Doe', '3201010101000001', '1985-03-15', 'MALE', '+6281234567001', 'john.doe@email.com', 'Jl. Merdeka 1, Jakarta', 'O+', 'Jane Doe', '+6281234567002', 'BPJS'),
  ('Jane Smith', '3201010101000002', '1990-07-22', 'FEMALE', '+6281234567003', 'jane.smith@email.com', 'Jl. Sudirman 5, Jakarta', 'A+', 'Bob Smith', '+6281234567004', 'BPJS'),
  ('Robert Wilson', '3201010101000003', '1978-11-30', 'MALE', '+6281234567005', 'robert.w@email.com', 'Jl. Gatot Subroto 10, Jakarta', 'B+', 'Mary Wilson', '+6281234567006', 'Private'),
  ('Emily Davis', '3201010101000004', '1995-02-14', 'FEMALE', '+6281234567007', 'emily.d@email.com', 'Jl. Thamrin 3, Jakarta', 'AB+', 'Tom Davis', '+6281234567008', 'BPJS'),
  ('Michael Lee', '3201010101000005', '1982-09-05', 'MALE', '+6281234567009', 'michael.l@email.com', 'Jl. Kuningan 7, Jakarta', 'O-', 'Lisa Lee', '+6281234567010', 'None'),
  ('Sarah Johnson', '3201010101000006', '1988-12-01', 'FEMALE', '+6281234567011', 'sarah.j@email.com', 'Jl. Senayan 2, Jakarta', 'A-', 'Mark Johnson', '+6281234567012', 'BPJS'),
  ('David Kim', '3201010101000007', '1975-06-18', 'MALE', '+6281234567013', 'david.k@email.com', 'Jl. Cipto 11, Jakarta', 'B-', 'Anna Kim', '+6281234567014', 'Private'),
  ('Lisa Anderson', '3201010101000008', '1992-04-25', 'FEMALE', '+6281234567015', 'lisa.a@email.com', 'Jl. Diponegoro 8, Jakarta', 'O+', 'Peter Anderson', '+6281234567016', 'BPJS'),
  ('James Brown', '3201010101000009', '1980-08-12', 'MALE', '+6281234567017', 'james.b@email.com', 'Jl. Pahlawan 4, Jakarta', 'A+', 'Sandra Brown', '+6281234567018', 'None'),
  ('Mary Taylor', '3201010101000010', '1993-01-20', 'FEMALE', '+6281234567019', 'mary.t@email.com', 'Jl. Veteran 6, Jakarta', 'AB-', 'James Taylor', '+6281234567020', 'BPJS'),
  ('Richard Garcia', '3201010101000011', '1970-05-03', 'MALE', '+6281234567021', 'richard.g@email.com', 'Jl. Kartini 9, Jakarta', 'B+', 'Carmen Garcia', '+6281234567022', 'Private'),
  ('Patricia Martinez', '3201010101000012', '1986-10-17', 'FEMALE', '+6281234567023', 'patricia.m@email.com', 'Jl. Melati 3, Jakarta', 'O+', 'Jose Martinez', '+6281234567024', 'BPJS'),
  ('Charles Robinson', '3201010101000013', '1972-03-28', 'MALE', '+6281234567025', 'charles.r@email.com', 'Jl. Mawar 5, Jakarta', 'A+', 'Diana Robinson', '+6281234567026', 'None'),
  ('Jennifer White', '3201010101000014', '1994-07-08', 'FEMALE', '+6281234567027', 'jennifer.w@email.com', 'Jl. Anggrek 7, Jakarta', 'B+', 'Michael White', '+6281234567028', 'BPJS'),
  ('Thomas Harris', '3201010101000015', '1983-11-22', 'MALE', '+6281234567029', 'thomas.h@email.com', 'Jl. Dahlia 2, Jakarta', 'O-', 'Susan Harris', '+6281234567030', 'Private'),
  ('Susan Clark', '3201010101000016', '1991-06-15', 'FEMALE', '+6281234567031', 'susan.c@email.com', 'Jl. Tulip 4, Jakarta', 'A-', 'Edward Clark', '+6281234567032', 'BPJS'),
  ('Daniel Lewis', '3201010101000017', '1977-02-09', 'MALE', '+6281234567033', 'daniel.l@email.com', 'Jl. Flamboyan 6, Jakarta', 'AB+', 'Rachel Lewis', '+6281234567034', 'None'),
  ('Nancy Walker', '3201010101000018', '1989-09-19', 'FEMALE', '+6281234567035', 'nancy.w@email.com', 'Jl. Cempaka 8, Jakarta', 'B-', 'Frank Walker', '+6281234567036', 'BPJS'),
  ('Kevin Hall', '3201010101000019', '1981-04-30', 'MALE', '+6281234567037', 'kevin.h@email.com', 'Jl. Teratai 1, Jakarta', 'O+', 'Michelle Hall', '+6281234567038', 'Private'),
  ('Karen Allen', '3201010101000020', '1996-12-05', 'FEMALE', '+6281234567039', 'karen.a@email.com', 'Jl. Bougenville 3, Jakarta', 'A+', 'Stephen Allen', '+6281234567040', 'BPJS')
) AS t(full_name, nik, dob, gender, phone, email, address, blood_type, emer_name, emer_phone, insurance)
WHERE NOT EXISTS (SELECT 1 FROM patients p WHERE p.full_name = t.full_name);

UPDATE mrn_counter SET next_value = 21 WHERE id = 1;

-- ============ SAMPLE APPOINTMENTS (today) ============
DO $$
DECLARE
  d1 uuid; d2 uuid; d3 uuid;
  p1 uuid; p2 uuid; p3 uuid; p4 uuid; p5 uuid;
  s1 uuid; s2 uuid;
  today_date date := CURRENT_DATE;
BEGIN
  SELECT id INTO d1 FROM doctors WHERE license_number = 'LIC-001';
  SELECT id INTO d2 FROM doctors WHERE license_number = 'LIC-002';
  SELECT id INTO d3 FROM doctors WHERE license_number = 'LIC-003';
  SELECT id INTO p1 FROM patients WHERE mrn = 'CLN-000001';
  SELECT id INTO p2 FROM patients WHERE mrn = 'CLN-000002';
  SELECT id INTO p3 FROM patients WHERE mrn = 'CLN-000003';
  SELECT id INTO p4 FROM patients WHERE mrn = 'CLN-000004';
  SELECT id INTO p5 FROM patients WHERE mrn = 'CLN-000005';
  SELECT id INTO s1 FROM services WHERE name = 'General Consultation';
  SELECT id INTO s2 FROM services WHERE name = 'Cardiology Consultation';

  INSERT INTO appointments (patient_id, doctor_id, service_id, appointment_date, start_time, end_time, status)
  VALUES
    (p1, d1, s1, today_date, '08:00', '08:20', 'CHECKED_IN'),
    (p2, d1, s1, today_date, '08:20', '08:40', 'CHECKED_IN'),
    (p3, d1, s1, today_date, '09:00', '09:20', 'CONFIRMED'),
    (p4, d2, s1, today_date, '09:00', '09:30', 'BOOKED'),
    (p5, d3, s2, today_date, '10:00', '10:30', 'CONFIRMED')
  ON CONFLICT DO NOTHING;
END $$;

-- ============ SAMPLE QUEUE ENTRIES ============
DO $$
DECLARE
  d1 uuid;
  p1 uuid; p2 uuid;
  apt1 uuid; apt2 uuid;
BEGIN
  SELECT id INTO d1 FROM doctors WHERE license_number = 'LIC-001';
  SELECT id INTO p1 FROM patients WHERE mrn = 'CLN-000001';
  SELECT id INTO p2 FROM patients WHERE mrn = 'CLN-000002';
  SELECT id INTO apt1 FROM appointments WHERE appointment_date = CURRENT_DATE AND start_time = '08:00' AND patient_id = p1;
  SELECT id INTO apt2 FROM appointments WHERE appointment_date = CURRENT_DATE AND start_time = '08:20' AND patient_id = p2;

  INSERT INTO queue_entries (queue_number, patient_id, doctor_id, appointment_id, status)
  VALUES
    ('G-001', p1, d1, apt1, 'WAITING'),
    ('G-002', p2, d1, apt2, 'WAITING')
  ON CONFLICT DO NOTHING;
END $$;

-- ============ SAMPLE VISIT + PRESCRIPTION + INVOICE ============
DO $$
DECLARE
  d1 uuid; p1 uuid;
  v1 uuid; presc1 uuid; rx_num text;
  inv_num text; inv1 uuid;
  med1 uuid; med7 uuid;
  dx_id uuid;
BEGIN
  SELECT id INTO d1 FROM doctors WHERE license_number = 'LIC-001';
  SELECT id INTO p1 FROM patients WHERE mrn = 'CLN-000001';
  SELECT id INTO med1 FROM medicines WHERE code = 'MED001';
  SELECT id INTO med7 FROM medicines WHERE code = 'MED007';
  SELECT id INTO dx_id FROM diagnoses WHERE icd10_code = 'J02.9';

  SELECT id INTO v1 FROM visits WHERE patient_id = p1 LIMIT 1;
  IF v1 IS NULL THEN
    INSERT INTO visits (patient_id, doctor_id, visit_date, status, chief_complaint, assessment, plan)
    VALUES (p1, d1, CURRENT_DATE - INTERVAL '7 days', 'COMPLETED',
      'Patient reports fever and sore throat for 3 days',
      'Acute pharyngitis, likely viral',
      'Rest, fluids, paracetamol as needed')
    RETURNING id INTO v1;

    INSERT INTO vital_signs (visit_id, blood_pressure_systolic, blood_pressure_diastolic, heart_rate, respiratory_rate, temperature, spo2, weight, height)
    VALUES (v1, 120, 80, 85, 18, 38.5, 97, 70, 170);

    INSERT INTO visit_diagnoses (visit_id, diagnosis_id, is_primary)
    VALUES (v1, dx_id, true);

    rx_num := 'RX-' || to_char(now() - INTERVAL '7 days', 'YYMMDD') || '-0001';
    INSERT INTO prescriptions (prescription_number, patient_id, doctor_id, visit_id, status)
    VALUES (rx_num, p1, d1, v1, 'DISPENSED')
    RETURNING id INTO presc1;

    INSERT INTO prescription_items (prescription_id, medicine_id, dosage, frequency, route, duration, quantity, instructions)
    VALUES
      (presc1, med1, '500mg', '3 times daily', 'Oral', '5 days', 15, 'Take after meals'),
      (presc1, med7, '20mg', '1 daily', 'Oral', '7 days', 7, 'Take before breakfast');

    inv_num := 'INV-' || to_char(now() - INTERVAL '7 days', 'YYMMDD') || '-0001';
    INSERT INTO invoices (invoice_number, patient_id, visit_id, invoice_date, subtotal, discount, tax, grand_total, status)
    VALUES (inv_num, p1, v1, CURRENT_DATE - INTERVAL '7 days', 179000, 0, 0, 179000, 'PAID')
    RETURNING id INTO inv1;

    INSERT INTO invoice_items (invoice_id, item_type, description, quantity, unit_price, total)
    VALUES
      (inv1, 'CONSULTATION', 'General Consultation', 1, 150000, 150000),
      (inv1, 'MEDICINE', 'Paracetamol 500mg x15', 1, 15000, 15000),
      (inv1, 'MEDICINE', 'Omeprazole 20mg x7', 1, 14000, 14000);

    INSERT INTO payments (invoice_id, amount, method, status)
    VALUES (inv1, 179000, 'CASH', 'PAID');
  END IF;
END $$;
