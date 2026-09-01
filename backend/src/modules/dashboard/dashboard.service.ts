import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, countDistinct, eq, gte, inArray, lte, sql, sum } from 'drizzle-orm';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { DATABASE, Database } from '../../database/database.module';
import { users } from '../../database/schema';
import { invoices } from '../../database/schema/billing';
import { visits } from '../../database/schema/clinical';
import { medicineBatches } from '../../database/schema/inventory';
import { appointments, clinicServices, doctors, queueEntries } from '../../database/schema/operations';
import { patients } from '../../database/schema/patients';
import { medicines, prescriptions } from '../../database/schema/prescribing';

const clinicDate = () => {
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
};

@Injectable()
export class DashboardService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}

  async get(user: AuthenticatedUser) {
    const day = clinicDate();
    const start = new Date(`${day}T00:00:00+08:00`);
    const end = new Date(`${day}T23:59:59.999+08:00`);

    if (user.role === 'ADMIN') return this.adminDashboard(day);

    if (user.role === 'RECEPTIONIST') {
      const [appointmentRows, waitingRows, checkedInRows, pendingRows] = await Promise.all([
        this.db.select({ value: count() }).from(appointments).where(eq(appointments.appointmentDate, day)),
        this.db.select({ value: count() }).from(queueEntries).where(and(eq(queueEntries.queueDate, day), eq(queueEntries.status, 'WAITING'))),
        this.db.select({ value: count() }).from(queueEntries).where(and(eq(queueEntries.queueDate, day), inArray(queueEntries.status, ['WAITING', 'CALLED', 'IN_CONSULTATION']))),
        this.db.select({ value: count() }).from(invoices).where(inArray(invoices.status, ['PENDING', 'PARTIAL'])),
      ]);
      return { title: 'Front office today', generatedAt: new Date().toISOString(), cards: [{ label: 'Appointments', value: appointmentRows[0].value }, { label: 'Waiting queue', value: waitingRows[0].value }, { label: 'Checked-in patients', value: checkedInRows[0].value }, { label: 'Pending payments', value: pendingRows[0].value }] };
    }

    if (user.role === 'DOCTOR') {
      const [doctor] = await this.db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id)).limit(1);
      const [waitingRows, consultationRows, completedRows] = await Promise.all([
        this.db.select({ value: count() }).from(queueEntries).where(and(eq(queueEntries.doctorId, doctor.id), eq(queueEntries.queueDate, day), inArray(queueEntries.status, ['WAITING', 'CALLED']))),
        this.db.select({ value: count() }).from(queueEntries).where(and(eq(queueEntries.doctorId, doctor.id), eq(queueEntries.queueDate, day), eq(queueEntries.status, 'IN_CONSULTATION'))),
        this.db.select({ value: count() }).from(visits).where(and(eq(visits.doctorId, doctor.id), gte(visits.completedAt, start), lte(visits.completedAt, end))),
      ]);
      return { title: 'Doctor workspace', generatedAt: new Date().toISOString(), cards: [{ label: 'Waiting patients', value: waitingRows[0].value }, { label: 'In consultation', value: consultationRows[0].value }, { label: 'Completed today', value: completedRows[0].value }] };
    }

    const expiryLimit = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    const [pendingRows, processingRows, readyRows, lowStockResult, expiringRows] = await Promise.all([
      this.db.select({ value: count() }).from(prescriptions).where(eq(prescriptions.status, 'SUBMITTED')),
      this.db.select({ value: count() }).from(prescriptions).where(eq(prescriptions.status, 'PROCESSING')),
      this.db.select({ value: count() }).from(prescriptions).where(eq(prescriptions.status, 'READY')),
      this.lowStockCount(),
      this.db.select({ value: count() }).from(medicineBatches).where(and(gte(medicineBatches.expiryDate, day), lte(medicineBatches.expiryDate, expiryLimit))),
    ]);
    return { title: 'Pharmacy today', generatedAt: new Date().toISOString(), cards: [{ label: 'Pending prescriptions', value: pendingRows[0].value }, { label: 'Processing', value: processingRows[0].value }, { label: 'Ready', value: readyRows[0].value }, { label: 'Low stock', value: Number(lowStockResult.rows[0]?.value ?? 0) }, { label: 'Expiring in 90 days', value: expiringRows[0].value }] };
  }

  private async adminDashboard(day: string) {
    const expiryLimit = new Date(Date.now() + 90 * 86_400_000).toISOString().slice(0, 10);
    const [patientRows, appointmentRows, checkedInRows, waitingRows, doctorRows, revenueRows, pendingRows, lowStockResult, expiringRows, todayAppointments, todayQueue] = await Promise.all([
      this.db.select({ value: countDistinct(appointments.patientId) }).from(appointments).where(eq(appointments.appointmentDate, day)),
      this.db.select({ value: count() }).from(appointments).where(eq(appointments.appointmentDate, day)),
      this.db.select({ value: count() }).from(queueEntries).where(and(eq(queueEntries.queueDate, day), inArray(queueEntries.status, ['WAITING', 'CALLED', 'IN_CONSULTATION']))),
      this.db.select({ value: count() }).from(queueEntries).where(and(eq(queueEntries.queueDate, day), eq(queueEntries.status, 'WAITING'))),
      this.db.select({ value: count() }).from(doctors).where(eq(doctors.isActive, true)),
      this.db.select({ value: sum(invoices.amountPaid) }).from(invoices).where(eq(invoices.invoiceDate, day)),
      this.db.select({ value: count() }).from(invoices).where(inArray(invoices.status, ['PENDING', 'PARTIAL'])),
      this.lowStockCount(),
      this.db.select({ value: count() }).from(medicineBatches).where(and(gte(medicineBatches.expiryDate, day), lte(medicineBatches.expiryDate, expiryLimit))),
      this.db.select({ id: appointments.id, startTime: appointments.startTime, status: appointments.status, patientName: patients.fullName, mrn: patients.mrn, doctorName: users.fullName, serviceName: clinicServices.name }).from(appointments).innerJoin(patients, eq(appointments.patientId, patients.id)).innerJoin(doctors, eq(appointments.doctorId, doctors.id)).innerJoin(users, eq(doctors.userId, users.id)).innerJoin(clinicServices, eq(appointments.serviceId, clinicServices.id)).where(eq(appointments.appointmentDate, day)).orderBy(asc(appointments.startTime)).limit(10),
      this.db.select({ id: queueEntries.id, queueNumber: queueEntries.queueNumber, status: queueEntries.status, checkedInAt: queueEntries.checkedInAt, patientName: patients.fullName, mrn: patients.mrn, doctorName: users.fullName }).from(queueEntries).innerJoin(patients, eq(queueEntries.patientId, patients.id)).innerJoin(doctors, eq(queueEntries.doctorId, doctors.id)).innerJoin(users, eq(doctors.userId, users.id)).where(eq(queueEntries.queueDate, day)).orderBy(asc(queueEntries.queueNumber)).limit(10),
    ]);

    const lowStock = Number(lowStockResult.rows[0]?.value ?? 0);
    const pendingPayments = pendingRows[0].value;
    const expiring = expiringRows[0].value;
    return {
      title: 'Clinic overview',
      generatedAt: new Date().toISOString(),
      clinicTimeZone: 'Asia/Makassar',
      cards: [
        { label: "Today's patients", value: patientRows[0].value },
        { label: "Today's appointments", value: appointmentRows[0].value },
        { label: 'Checked in now', value: checkedInRows[0].value },
        { label: 'Waiting queue', value: waitingRows[0].value },
        { label: 'Revenue received', value: Number(revenueRows[0].value ?? 0), format: 'currency' },
        { label: 'Active doctors', value: doctorRows[0].value },
      ],
      appointments: todayAppointments,
      queue: todayQueue,
      alerts: [
        { label: 'Pending payments', value: pendingPayments, tone: pendingPayments > 0 ? 'warning' : 'ok', href: '/front-office/billing' },
        { label: 'Low-stock medicines', value: lowStock, tone: lowStock > 0 ? 'danger' : 'ok', href: '/pharmacy/inventory' },
        { label: 'Batches expiring within 90 days', value: expiring, tone: expiring > 0 ? 'warning' : 'ok', href: '/pharmacy/inventory' },
      ],
    };
  }

  private lowStockCount() {
    return this.db.execute(sql`select count(*)::int as value from (select m.id from medicines m left join medicine_batches b on b.medicine_id=m.id group by m.id having coalesce(sum(b.quantity),0)<=m.minimum_stock) low_stock`);
  }
}
