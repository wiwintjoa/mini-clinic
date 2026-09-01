import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, eq, sql } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { visits } from '../../database/schema/clinical';
import { appointments, doctors, queueCounters, queueEntries } from '../../database/schema/operations';
import { patientVitalSigns, patients } from '../../database/schema/patients';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AuditContext, AuditService } from '../audit/audit.service';
import { CheckInDto, QueueListQueryDto, UpdateQueueStatusDto } from './queue.dto';

const clinicDate = () => { const parts = new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date()); const value = Object.fromEntries(parts.map((part) => [part.type, part.value])); return `${value.year}-${value.month}-${value.day}`; };
const queueNumber = (value: number) => `A-${value.toString().padStart(3, '0')}`;

@Injectable()
export class QueueService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly audit: AuditService) {}

  async list(query: QueueListQueryDto, user: AuthenticatedUser) {
    const date = query.date ?? clinicDate();
    let doctorId: string | undefined;
    if (!user.permissions.includes('QUEUE_READ_ANY')) {
      if (!user.permissions.includes('QUEUE_READ_ASSIGNED')) throw new ForbiddenException('Insufficient permission');
      const [doctor] = await this.db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id)).limit(1);
      if (!doctor) throw new ForbiddenException('Doctor profile is unavailable');
      doctorId = doctor.id;
    }
    const where = doctorId ? and(eq(queueEntries.queueDate, date), eq(queueEntries.doctorId, doctorId)) : eq(queueEntries.queueDate, date);
    return this.db.select({ id: queueEntries.id, queueNumber: queueEntries.queueNumber, status: queueEntries.status, checkedInAt: queueEntries.checkedInAt, appointmentId: appointments.id, appointmentType: sql<string>`'APPOINTMENT'`, startTime: appointments.startTime, patientId: patients.id, patientName: patients.fullName, mrn: patients.mrn, dateOfBirth: patients.dateOfBirth, gender: patients.gender, doctorId: queueEntries.doctorId, visitId: visits.id }).from(queueEntries).innerJoin(appointments, eq(queueEntries.appointmentId, appointments.id)).innerJoin(patients, eq(queueEntries.patientId, patients.id)).leftJoin(visits, eq(queueEntries.id, visits.queueEntryId)).where(where).orderBy(asc(queueEntries.queueNumber));
  }

  async checkIn(appointmentId: string, dto: CheckInDto, context: AuditContext) {
    const result = await this.db.transaction(async (tx) => {
      const [appointment] = await tx.select().from(appointments).where(eq(appointments.id, appointmentId)).limit(1);
      if (!appointment) throw new NotFoundException('Appointment not found');
      if (!['BOOKED', 'CONFIRMED'].includes(appointment.status)) throw new BadRequestException('Only booked or confirmed appointments can check in');
      const date = clinicDate();
      if (appointment.appointmentDate !== date) throw new BadRequestException('Only today appointments can check in');
      const [counter] = await tx.insert(queueCounters).values({ queueDate: date, prefix: 'A', nextValue: 2 }).onConflictDoUpdate({ target: [queueCounters.queueDate, queueCounters.prefix], set: { nextValue: sql`${queueCounters.nextValue}+1` } }).returning({ nextValue: queueCounters.nextValue });
      await tx.update(appointments).set({ status: 'CHECKED_IN', updatedAt: new Date() }).where(eq(appointments.id, appointmentId));
      const [entry] = await tx.insert(queueEntries).values({ appointmentId, patientId: appointment.patientId, doctorId: appointment.doctorId, queueDate: date, queueNumber: queueNumber(counter.nextValue - 1) }).returning();
      let measurement = null;
      if (dto.measurement) {
        const m = dto.measurement;
        [measurement] = await tx.insert(patientVitalSigns).values({ patientId: appointment.patientId, visitId: null, systolicBloodPressure: m.systolicBloodPressure, diastolicBloodPressure: m.diastolicBloodPressure, weightKg: String(m.weightKg), heightCm: String(m.heightCm), temperature: m.temperature === undefined ? null : String(m.temperature), heartRate: m.heartRate ?? null, respiratoryRate: m.respiratoryRate ?? null, oxygenSaturation: m.oxygenSaturation ?? null, measuredBy: context.userId }).returning();
      }
      return { entry, measurement };
    });
    await this.audit.log({ ...context, action: 'APPOINTMENT_CHECK_IN', entity: 'queue_entries', entityId: result.entry.id, newValue: result.entry });
    if (result.measurement) await this.audit.log({ ...context, action: 'patient_vital_sign.created', entity: 'patient_vital_signs', entityId: result.measurement.id, newValue: result.measurement });
    return result.entry;
  }

  async update(id: string, dto: UpdateQueueStatusDto, user: AuthenticatedUser, context: AuditContext) {
    const [entry] = await this.db.select().from(queueEntries).where(eq(queueEntries.id, id)).limit(1);
    if (!entry) throw new NotFoundException('Queue entry not found');
    if (!user.permissions.includes('QUEUE_MANAGE_ANY')) {
      if (!user.permissions.includes('QUEUE_MANAGE_ASSIGNED')) throw new ForbiddenException('Insufficient permission');
      const [doctor] = await this.db.select({ id: doctors.id }).from(doctors).where(eq(doctors.userId, user.id)).limit(1);
      if (!doctor || doctor.id !== entry.doctorId) throw new ForbiddenException('Queue is assigned to another doctor');
      if (dto.status === 'COMPLETED') throw new BadRequestException('Complete the consultation from the consultation page');
    }
    const set: { status: typeof dto.status; updatedAt: Date; calledAt?: Date; completedAt?: Date } = { status: dto.status, updatedAt: new Date() };
    if (dto.status === 'CALLED') set.calledAt = new Date();
    if (dto.status === 'COMPLETED') set.completedAt = new Date();
    const [updated] = await this.db.update(queueEntries).set(set).where(eq(queueEntries.id, id)).returning();
    await this.audit.log({ ...context, action: 'QUEUE_STATUS_UPDATE', entity: 'queue_entries', entityId: id, oldValue: entry, newValue: updated });
    return updated;
  }
}
