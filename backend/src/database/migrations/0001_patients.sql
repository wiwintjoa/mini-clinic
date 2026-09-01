CREATE TYPE patient_gender AS ENUM ('MALE', 'FEMALE', 'OTHER');
CREATE TYPE patient_status AS ENUM ('ACTIVE', 'INACTIVE');
CREATE TYPE blood_type AS ENUM ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-');

CREATE TABLE mrn_counters (
  clinic_code text PRIMARY KEY,
  next_value integer NOT NULL DEFAULT 1,
  CONSTRAINT mrn_counters_positive_check CHECK (next_value > 0)
);
INSERT INTO mrn_counters (clinic_code, next_value) VALUES ('CLN', 1);

CREATE TABLE patients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mrn text NOT NULL UNIQUE,
  full_name text NOT NULL,
  nik text,
  date_of_birth date NOT NULL,
  gender patient_gender NOT NULL,
  phone text NOT NULL,
  email text,
  address text NOT NULL,
  blood_type blood_type,
  emergency_contact_name text,
  emergency_contact_phone text,
  insurance text,
  status patient_status NOT NULL DEFAULT 'ACTIVE',
  portal_user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX patients_nik_uidx ON patients(nik) WHERE nik IS NOT NULL;
CREATE UNIQUE INDEX patients_portal_user_uidx ON patients(portal_user_id) WHERE portal_user_id IS NOT NULL;
CREATE INDEX patients_name_idx ON patients(full_name);
CREATE INDEX patients_phone_idx ON patients(phone);
CREATE INDEX patients_status_idx ON patients(status);

CREATE TABLE audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES users(id) ON DELETE SET NULL,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  ip_address text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX audit_logs_entity_idx ON audit_logs(entity, entity_id);
CREATE INDEX audit_logs_user_idx ON audit_logs(user_id);
CREATE INDEX audit_logs_created_idx ON audit_logs(created_at);
