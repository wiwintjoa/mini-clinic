ALTER TYPE blood_type ADD VALUE IF NOT EXISTS 'A';
ALTER TYPE blood_type ADD VALUE IF NOT EXISTS 'B';
ALTER TYPE blood_type ADD VALUE IF NOT EXISTS 'AB';
ALTER TYPE blood_type ADD VALUE IF NOT EXISTS 'O';
ALTER TYPE blood_type ADD VALUE IF NOT EXISTS 'UNKNOWN';

ALTER TABLE patients
  ADD COLUMN emergency_contact_relationship text,
  ADD COLUMN payment_type text NOT NULL DEFAULT 'SELF_PAY',
  ADD COLUMN insurance_provider text,
  ADD COLUMN insurance_member_number text,
  ADD COLUMN registered_at timestamptz NOT NULL DEFAULT now(),
  ADD CONSTRAINT patients_payment_type_check CHECK (payment_type IN ('SELF_PAY','INSURANCE','COMPANY','OTHER'));

CREATE TABLE patient_vital_signs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  visit_id uuid REFERENCES visits(id) ON DELETE SET NULL,
  systolic_blood_pressure integer NOT NULL,
  diastolic_blood_pressure integer NOT NULL,
  weight_kg numeric(6,2) NOT NULL,
  height_cm numeric(5,2) NOT NULL,
  temperature numeric(4,1),
  heart_rate integer,
  respiratory_rate integer,
  oxygen_saturation integer,
  measured_at timestamptz NOT NULL DEFAULT now(),
  measured_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT patient_vitals_systolic_check CHECK (systolic_blood_pressure BETWEEN 40 AND 300),
  CONSTRAINT patient_vitals_diastolic_check CHECK (diastolic_blood_pressure BETWEEN 20 AND 200),
  CONSTRAINT patient_vitals_weight_check CHECK (weight_kg > 0 AND weight_kg <= 500),
  CONSTRAINT patient_vitals_height_check CHECK (height_cm > 0 AND height_cm <= 250),
  CONSTRAINT patient_vitals_temperature_check CHECK (temperature IS NULL OR temperature BETWEEN 30 AND 45),
  CONSTRAINT patient_vitals_heart_rate_check CHECK (heart_rate IS NULL OR heart_rate BETWEEN 20 AND 250),
  CONSTRAINT patient_vitals_respiratory_rate_check CHECK (respiratory_rate IS NULL OR respiratory_rate BETWEEN 5 AND 80),
  CONSTRAINT patient_vitals_oxygen_check CHECK (oxygen_saturation IS NULL OR oxygen_saturation BETWEEN 0 AND 100)
);
CREATE INDEX patient_vital_signs_patient_idx ON patient_vital_signs(patient_id);
CREATE INDEX patient_vital_signs_patient_measured_idx ON patient_vital_signs(patient_id, measured_at DESC);
CREATE INDEX patient_vital_signs_visit_idx ON patient_vital_signs(visit_id);

ALTER TABLE visits
  ADD COLUMN examination_findings text,
  ADD COLUMN clinical_note text,
  ADD COLUMN treatment_note text,
  ADD COLUMN follow_up_note text,
  ADD COLUMN follow_up_date date;

UPDATE visits SET
  examination_findings = COALESCE(clinical_findings, physical_examination),
  clinical_note = additional_notes,
  treatment_note = treatment_plan,
  follow_up_note = follow_up;
