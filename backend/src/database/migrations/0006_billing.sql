CREATE TYPE invoice_status AS ENUM ('PENDING','PAID','PARTIAL','REFUNDED','CANCELLED');
CREATE TYPE invoice_item_type AS ENUM ('CONSULTATION','MEDICINE','SERVICE');
CREATE TYPE payment_method AS ENUM ('CASH','DEBIT_CARD','CREDIT_CARD','BANK_TRANSFER','QRIS','INSURANCE');
CREATE TYPE payment_status AS ENUM ('PENDING','PAID','REFUNDED','CANCELLED');
CREATE TABLE invoice_counters (counter_date date PRIMARY KEY, next_value integer NOT NULL DEFAULT 1, CONSTRAINT invoice_counter_positive_check CHECK (next_value > 0));
CREATE TABLE invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_number text NOT NULL UNIQUE,
  patient_id uuid NOT NULL REFERENCES patients(id) ON DELETE RESTRICT,
  visit_id uuid NOT NULL UNIQUE REFERENCES visits(id) ON DELETE RESTRICT,
  invoice_date date NOT NULL, subtotal numeric(14,2) NOT NULL, discount numeric(14,2) NOT NULL DEFAULT 0,
  tax numeric(14,2) NOT NULL DEFAULT 0, grand_total numeric(14,2) NOT NULL, amount_paid numeric(14,2) NOT NULL DEFAULT 0,
  status invoice_status NOT NULL DEFAULT 'PENDING', created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoices_amounts_check CHECK (subtotal >= 0 AND discount >= 0 AND tax >= 0 AND grand_total >= 0 AND amount_paid >= 0 AND amount_paid <= grand_total)
);
CREATE INDEX invoices_patient_idx ON invoices(patient_id); CREATE INDEX invoices_date_idx ON invoices(invoice_date); CREATE INDEX invoices_status_idx ON invoices(status);
CREATE TABLE invoice_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  type invoice_item_type NOT NULL, reference_id uuid, description text NOT NULL, quantity integer NOT NULL,
  unit_price numeric(14,2) NOT NULL, total numeric(14,2) NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT invoice_items_amount_check CHECK (quantity > 0 AND unit_price >= 0 AND total >= 0)
);
CREATE INDEX invoice_items_invoice_idx ON invoice_items(invoice_id);
CREATE TABLE payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid NOT NULL REFERENCES invoices(id) ON DELETE RESTRICT,
  payment_number text NOT NULL UNIQUE, amount numeric(14,2) NOT NULL, method payment_method NOT NULL,
  status payment_status NOT NULL DEFAULT 'PAID', reference text, received_by uuid NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  paid_at timestamptz NOT NULL DEFAULT now(), created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT payments_amount_check CHECK (amount > 0)
);
CREATE UNIQUE INDEX payments_reference_uidx ON payments(reference) WHERE reference IS NOT NULL;
CREATE INDEX payments_invoice_idx ON payments(invoice_id); CREATE INDEX payments_paid_at_idx ON payments(paid_at);
