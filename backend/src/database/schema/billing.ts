import { sql } from 'drizzle-orm';
import { check, date, index, integer, numeric, pgEnum, pgTable, text, timestamp, uniqueIndex, uuid } from 'drizzle-orm/pg-core';

export const invoiceStatus = pgEnum('invoice_status', ['PENDING', 'PAID', 'PARTIAL', 'REFUNDED', 'CANCELLED']);
export const invoiceItemType = pgEnum('invoice_item_type', ['CONSULTATION', 'MEDICINE', 'SERVICE']);
export const paymentMethod = pgEnum('payment_method', ['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'QRIS', 'INSURANCE']);
export const paymentStatus = pgEnum('payment_status', ['PENDING', 'PAID', 'REFUNDED', 'CANCELLED']);

export const invoiceCounters = pgTable('invoice_counters', {
  counterDate: date('counter_date', { mode: 'string' }).primaryKey(),
  nextValue: integer('next_value').notNull().default(1),
}, (table) => [check('invoice_counter_positive_check', sql`${table.nextValue} > 0`)]);

export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceNumber: text('invoice_number').notNull().unique(),
  patientId: uuid('patient_id').notNull(),
  visitId: uuid('visit_id').notNull().unique(),
  invoiceDate: date('invoice_date', { mode: 'string' }).notNull(),
  subtotal: numeric('subtotal', { precision: 14, scale: 2 }).notNull(),
  discount: numeric('discount', { precision: 14, scale: 2 }).notNull().default('0'),
  tax: numeric('tax', { precision: 14, scale: 2 }).notNull().default('0'),
  grandTotal: numeric('grand_total', { precision: 14, scale: 2 }).notNull(),
  amountPaid: numeric('amount_paid', { precision: 14, scale: 2 }).notNull().default('0'),
  status: invoiceStatus('status').notNull().default('PENDING'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('invoices_patient_idx').on(table.patientId),
  index('invoices_date_idx').on(table.invoiceDate),
  index('invoices_status_idx').on(table.status),
  check('invoices_amounts_check', sql`${table.subtotal} >= 0 AND ${table.discount} >= 0 AND ${table.tax} >= 0 AND ${table.grandTotal} >= 0 AND ${table.amountPaid} >= 0 AND ${table.amountPaid} <= ${table.grandTotal}`),
]);

export const invoiceItems = pgTable('invoice_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull(),
  type: invoiceItemType('type').notNull(),
  referenceId: uuid('reference_id'),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unitPrice: numeric('unit_price', { precision: 14, scale: 2 }).notNull(),
  total: numeric('total', { precision: 14, scale: 2 }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [index('invoice_items_invoice_idx').on(table.invoiceId), check('invoice_items_amount_check', sql`${table.quantity} > 0 AND ${table.unitPrice} >= 0 AND ${table.total} >= 0`)]);

export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  invoiceId: uuid('invoice_id').notNull(),
  paymentNumber: text('payment_number').notNull().unique(),
  amount: numeric('amount', { precision: 14, scale: 2 }).notNull(),
  method: paymentMethod('method').notNull(),
  status: paymentStatus('status').notNull().default('PAID'),
  reference: text('reference'),
  receivedBy: uuid('received_by').notNull(),
  paidAt: timestamp('paid_at', { withTimezone: true }).notNull().defaultNow(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [uniqueIndex('payments_reference_uidx').on(table.reference).where(sql`${table.reference} IS NOT NULL`), index('payments_invoice_idx').on(table.invoiceId), index('payments_paid_at_idx').on(table.paidAt), check('payments_amount_check', sql`${table.amount} > 0`)]);
