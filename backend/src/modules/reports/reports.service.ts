import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, count, countDistinct, desc, eq, gte, lte, sql, sum } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { invoices } from '../../database/schema/billing';
import { visits } from '../../database/schema/clinical';
import { appointments, clinicServices, doctors } from '../../database/schema/operations';
import { patients } from '../../database/schema/patients';
import { medicines, prescriptionItems, prescriptions } from '../../database/schema/prescribing';
import { medicineBatches } from '../../database/schema/inventory';
import { users } from '../../database/schema';
import { ReportFilterDto, reportTypes, ReportType } from './reports.dto';

export type ReportResult = { columns: Array<{ key: string; label: string }>; rows: Array<Record<string, unknown>> };
const columns = (...pairs: Array<[string, string]>) => pairs.map(([key, label]) => ({ key, label }));

@Injectable()
export class ReportsService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async run(typeValue: string, filter: ReportFilterDto): Promise<ReportResult> {
    if (!reportTypes.includes(typeValue as ReportType)) throw new BadRequestException('Unknown report type');
    const type = typeValue as ReportType; const { from, to } = this.range(filter);
    if (type === 'daily-patients') {
      const where = and(gte(visits.startedAt, from), lte(visits.startedAt, to), filter.doctorId ? eq(visits.doctorId, filter.doctorId) : undefined);
      const rows = await this.db.select({ date: sql<string>`date(${visits.startedAt})`, patients: countDistinct(visits.patientId), visits: count(visits.id) }).from(visits).where(where).groupBy(sql`date(${visits.startedAt})`).orderBy(asc(sql`date(${visits.startedAt})`));
      return { columns: columns(['date', 'Date'], ['patients', 'Unique patients'], ['visits', 'Visits']), rows };
    }
    if (type === 'revenue') {
      const rows = await this.db.select({ date: invoices.invoiceDate, invoices: count(invoices.id), billed: sum(invoices.grandTotal), paid: sum(invoices.amountPaid) }).from(invoices).where(and(gte(invoices.invoiceDate, from.toISOString().slice(0, 10)), lte(invoices.invoiceDate, to.toISOString().slice(0, 10)))).groupBy(invoices.invoiceDate).orderBy(asc(invoices.invoiceDate));
      return { columns: columns(['date', 'Date'], ['invoices', 'Invoices'], ['billed', 'Billed'], ['paid', 'Paid']), rows };
    }
    if (type === 'doctors') {
      const rows = await this.db.select({ doctor: users.fullName, specialty: doctors.specialty, visits: count(visits.id), uniquePatients: countDistinct(visits.patientId) }).from(doctors).innerJoin(users, eq(doctors.userId, users.id)).leftJoin(visits, and(eq(visits.doctorId, doctors.id), gte(visits.startedAt, from), lte(visits.startedAt, to))).where(filter.doctorId ? eq(doctors.id, filter.doctorId) : undefined).groupBy(doctors.id, users.fullName).orderBy(desc(count(visits.id)));
      return { columns: columns(['doctor', 'Doctor'], ['specialty', 'Specialty'], ['visits', 'Visits'], ['uniquePatients', 'Unique patients']), rows };
    }
    if (type === 'pharmacy') {
      const rows = await this.db.select({ status: prescriptions.status, prescriptions: countDistinct(prescriptions.id), itemLines: count(prescriptionItems.id), quantity: sum(prescriptionItems.dispensedQuantity) }).from(prescriptions).leftJoin(prescriptionItems, eq(prescriptionItems.prescriptionId, prescriptions.id)).where(and(gte(prescriptions.createdAt, from), lte(prescriptions.createdAt, to), filter.doctorId ? eq(prescriptions.doctorId, filter.doctorId) : undefined)).groupBy(prescriptions.status).orderBy(prescriptions.status);
      return { columns: columns(['status', 'Status'], ['prescriptions', 'Prescriptions'], ['itemLines', 'Item lines'], ['quantity', 'Dispensed quantity']), rows };
    }
    if (type === 'inventory') {
      const rows = await this.db.select({ code: medicines.code, medicine: medicines.name, genericName: medicines.genericName, unit: medicines.unit, minimumStock: medicines.minimumStock, stock: sum(medicineBatches.quantity), earliestExpiry: sql<string>`min(${medicineBatches.expiryDate})` }).from(medicines).leftJoin(medicineBatches, eq(medicineBatches.medicineId, medicines.id)).groupBy(medicines.id).orderBy(asc(medicines.name));
      return { columns: columns(['code', 'Code'], ['medicine', 'Medicine'], ['genericName', 'Generic name'], ['unit', 'Unit'], ['minimumStock', 'Minimum stock'], ['stock', 'Stock'], ['earliestExpiry', 'Earliest expiry']), rows };
    }
    if (type === 'appointments') {
      const rows = await this.db.select({ status: appointments.status, appointments: count(appointments.id), patients: countDistinct(appointments.patientId) }).from(appointments).where(and(gte(appointments.appointmentDate, from.toISOString().slice(0, 10)), lte(appointments.appointmentDate, to.toISOString().slice(0, 10)), filter.doctorId ? eq(appointments.doctorId, filter.doctorId) : undefined, filter.serviceId ? eq(appointments.serviceId, filter.serviceId) : undefined)).groupBy(appointments.status).orderBy(appointments.status);
      return { columns: columns(['status', 'Status'], ['appointments', 'Appointments'], ['patients', 'Unique patients']), rows };
    }
    const rows = await this.db.select({ doctor: users.fullName, service: clinicServices.name, cancellations: count(appointments.id) }).from(appointments).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).innerJoin(users, eq(doctors.userId, users.id)).innerJoin(clinicServices, eq(appointments.serviceId, clinicServices.id)).where(and(eq(appointments.status, 'CANCELLED'), gte(appointments.appointmentDate, from.toISOString().slice(0, 10)), lte(appointments.appointmentDate, to.toISOString().slice(0, 10)), filter.doctorId ? eq(appointments.doctorId, filter.doctorId) : undefined, filter.serviceId ? eq(appointments.serviceId, filter.serviceId) : undefined)).groupBy(doctors.id, users.fullName, clinicServices.id).orderBy(desc(count(appointments.id)));
    return { columns: columns(['doctor', 'Doctor'], ['service', 'Service'], ['cancellations', 'Cancellations']), rows };
  }
  toCsv(report: ReportResult) { const escape = (value: unknown) => `"${String(value ?? '').replaceAll('"', '""')}"`; return [report.columns.map((column) => escape(column.label)).join(','), ...report.rows.map((row) => report.columns.map((column) => escape(row[column.key])).join(','))].join('\r\n'); }
  private range(filter: ReportFilterDto) { const today = new Date(); const defaultFrom = new Date(today.getTime() - 29 * 86_400_000); const from = new Date(`${filter.dateFrom ?? defaultFrom.toISOString().slice(0, 10)}T00:00:00.000Z`); const to = new Date(`${filter.dateTo ?? today.toISOString().slice(0, 10)}T23:59:59.999Z`); if (from > to) throw new BadRequestException('dateFrom must not be after dateTo'); return { from, to }; }
}
