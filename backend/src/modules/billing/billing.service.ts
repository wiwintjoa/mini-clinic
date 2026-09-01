import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { appointments, clinicServices } from '../../database/schema/operations';
import { invoices, invoiceCounters, invoiceItems, payments } from '../../database/schema/billing';
import { patients } from '../../database/schema/patients';
import { medicines, prescriptionItems, prescriptions } from '../../database/schema/prescribing';
import { visits } from '../../database/schema/clinical';
import { AuditContext, AuditService } from '../audit/audit.service';
import { BillingListQueryDto, GenerateInvoiceDto } from './billing.dto';

type BillableItem = { type: 'CONSULTATION' | 'MEDICINE' | 'SERVICE'; referenceId?: string; description: string; quantity: number; unitPrice: number };
export function calculateInvoiceTotals(items: BillableItem[], discount = 0, tax = 0) {
  const subtotalCents = items.reduce((sum, item) => sum + Math.round(item.unitPrice * 100) * item.quantity, 0);
  const grandCents = subtotalCents - Math.round(discount * 100) + Math.round(tax * 100);
  if (grandCents < 0) throw new BadRequestException('Discount cannot exceed subtotal plus tax');
  return { subtotal: (subtotalCents / 100).toFixed(2), discount: discount.toFixed(2), tax: tax.toFixed(2), grandTotal: (grandCents / 100).toFixed(2) };
}

@Injectable()
export class BillingService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly audit: AuditService) {}

  async list(query: BillingListQueryDto) {
    const filter = query.search ? or(ilike(invoices.invoiceNumber, `%${query.search}%`), ilike(patients.fullName, `%${query.search}%`), ilike(patients.mrn, `%${query.search}%`)) : undefined;
    const sortColumns = { invoiceDate: invoices.invoiceDate, invoiceNumber: invoices.invoiceNumber, grandTotal: invoices.grandTotal };
    const order = query.sortDirection === 'asc' ? asc(sortColumns[query.sortBy]) : desc(sortColumns[query.sortBy]);
    const data = await this.db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, invoiceDate: invoices.invoiceDate, status: invoices.status, grandTotal: invoices.grandTotal, amountPaid: invoices.amountPaid, patientName: patients.fullName, mrn: patients.mrn }).from(invoices).innerJoin(patients, eq(invoices.patientId, patients.id)).where(filter).orderBy(order).limit(query.limit).offset((query.page - 1) * query.limit);
    const [totalRow] = await this.db.select({ value: count() }).from(invoices).innerJoin(patients, eq(invoices.patientId, patients.id)).where(filter);
    const total = totalRow.value;
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async unbilledVisits() {
    return this.db.select({ id: visits.id, completedAt: visits.completedAt, patientName: patients.fullName, mrn: patients.mrn, serviceName: clinicServices.name }).from(visits).innerJoin(patients, eq(visits.patientId, patients.id)).leftJoin(appointments, eq(visits.appointmentId, appointments.id)).leftJoin(clinicServices, eq(appointments.serviceId, clinicServices.id)).leftJoin(invoices, eq(invoices.visitId, visits.id)).where(and(eq(visits.status, 'COMPLETED'), sql`${invoices.id} IS NULL`)).orderBy(desc(visits.completedAt)).limit(100);
  }
  async detail(id: string) {
    const [invoice] = await this.db.select({ id: invoices.id, invoiceNumber: invoices.invoiceNumber, visitId: invoices.visitId, patientId: invoices.patientId, patientName: patients.fullName, mrn: patients.mrn, invoiceDate: invoices.invoiceDate, subtotal: invoices.subtotal, discount: invoices.discount, tax: invoices.tax, grandTotal: invoices.grandTotal, amountPaid: invoices.amountPaid, status: invoices.status }).from(invoices).innerJoin(patients, eq(invoices.patientId, patients.id)).where(eq(invoices.id, id)).limit(1);
    if (!invoice) throw new NotFoundException('Invoice not found');
    const items = await this.db.select().from(invoiceItems).where(eq(invoiceItems.invoiceId, id)).orderBy(asc(invoiceItems.createdAt));
    const receiptPayments = await this.db.select().from(payments).where(eq(payments.invoiceId, id)).orderBy(desc(payments.paidAt));
    return { ...invoice, balance: (Number(invoice.grandTotal) - Number(invoice.amountPaid)).toFixed(2), items, payments: receiptPayments };
  }

  async generate(visitId: string, dto: GenerateInvoiceDto, context: AuditContext) {
    const existing = await this.db.select({ id: invoices.id }).from(invoices).where(eq(invoices.visitId, visitId)).limit(1);
    if (existing[0]) return this.detail(existing[0].id);
    const [visit] = await this.db.select({ id: visits.id, status: visits.status, patientId: visits.patientId, serviceId: appointments.serviceId, serviceName: clinicServices.name, servicePrice: clinicServices.price }).from(visits).leftJoin(appointments, eq(visits.appointmentId, appointments.id)).leftJoin(clinicServices, eq(appointments.serviceId, clinicServices.id)).where(eq(visits.id, visitId)).limit(1);
    if (!visit) throw new NotFoundException('Visit not found');
    if (visit.status !== 'COMPLETED') throw new BadRequestException('Only completed visits can be invoiced');
    const [prescription] = await this.db.select().from(prescriptions).where(eq(prescriptions.visitId, visitId)).limit(1);
    if (prescription && prescription.status !== 'DISPENSED') throw new ConflictException('Prescription must be dispensed before invoice generation');
    const items: BillableItem[] = [];
    if (visit.serviceId && visit.serviceName && visit.servicePrice) items.push({ type: 'CONSULTATION', referenceId: visit.serviceId, description: visit.serviceName, quantity: 1, unitPrice: Number(visit.servicePrice) });
    if (prescription) {
      const medicinesRows = await this.db.select({ medicineId: medicines.id, name: medicines.name, quantity: prescriptionItems.dispensedQuantity, price: medicines.sellingPrice }).from(prescriptionItems).innerJoin(medicines, eq(prescriptionItems.medicineId, medicines.id)).where(and(eq(prescriptionItems.prescriptionId, prescription.id), sql`${prescriptionItems.dispensedQuantity} > 0`));
      for (const medicine of medicinesRows) items.push({ type: 'MEDICINE', referenceId: medicine.medicineId, description: medicine.name, quantity: medicine.quantity, unitPrice: Number(medicine.price) });
    }
    if (!items.length) throw new BadRequestException('Visit has no billable items');
    const totals = calculateInvoiceTotals(items, dto.discount, dto.tax);
    const invoice = await this.db.transaction(async (tx) => {
      const day = new Date().toISOString().slice(0, 10);
      const [counter] = await tx.insert(invoiceCounters).values({ counterDate: day, nextValue: 2 }).onConflictDoUpdate({ target: invoiceCounters.counterDate, set: { nextValue: sql`${invoiceCounters.nextValue} + 1` } }).returning({ nextValue: invoiceCounters.nextValue });
      const sequence = counter.nextValue - 1;
      const invoiceNumber = `INV-${day.replaceAll('-', '')}-${String(sequence).padStart(4, '0')}`;
      const [created] = await tx.insert(invoices).values({ invoiceNumber, patientId: visit.patientId, visitId, invoiceDate: day, ...totals }).returning();
      await tx.insert(invoiceItems).values(items.map((item) => ({ invoiceId: created.id, type: item.type, referenceId: item.referenceId, description: item.description, quantity: item.quantity, unitPrice: item.unitPrice.toFixed(2), total: (item.unitPrice * item.quantity).toFixed(2) })));
      return created;
    });
    await this.audit.log({ ...context, action: 'INVOICE_CREATE', entity: 'invoices', entityId: invoice.id, newValue: invoice });
    return this.detail(invoice.id);
  }
}
