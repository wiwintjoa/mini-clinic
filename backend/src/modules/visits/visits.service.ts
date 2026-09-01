import { BadRequestException, ForbiddenException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq, isNull, ne } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { appointments, doctors, queueEntries } from '../../database/schema/operations';
import { patientVitalSigns, patients } from '../../database/schema/patients';
import { diagnoses, visitDiagnoses, visits } from '../../database/schema/clinical';
import { medicines, prescriptionItems, prescriptions } from '../../database/schema/prescribing';
import { users } from '../../database/schema';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AuditContext, AuditService } from '../audit/audit.service';
import { AddVisitDiagnosisDto, UpdateConsultationDto, UpdateSoapDto, UpsertVitalsDto } from './visit.dto';

@Injectable()
export class VisitsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly audit: AuditService) {}

  private async ownedDoctor(userId: string) { const [doctor] = await this.db.select().from(doctors).where(and(eq(doctors.userId, userId), eq(doctors.isActive, true))).limit(1); if (!doctor) throw new ForbiddenException('Doctor profile is unavailable'); return doctor; }

  async start(queueId: string, user: AuthenticatedUser, context: AuditContext) {
    const doctor = await this.ownedDoctor(user.id);
    const visit = await this.db.transaction(async (tx) => {
      const [entry] = await tx.select().from(queueEntries).where(eq(queueEntries.id, queueId)).limit(1);
      if (!entry) throw new NotFoundException('Queue entry not found');
      if (entry.doctorId !== doctor.id) throw new ForbiddenException('Queue is assigned to another doctor');
      if (!['WAITING', 'CALLED', 'IN_CONSULTATION'].includes(entry.status)) throw new BadRequestException('Queue entry cannot start consultation');
      const [existing] = await tx.select().from(visits).where(eq(visits.queueEntryId, queueId)).limit(1);
      if (existing) return existing;
      const [created] = await tx.insert(visits).values({ appointmentId: entry.appointmentId, queueEntryId: entry.id, patientId: entry.patientId, doctorId: entry.doctorId }).returning();
      const [unlinkedMeasurement] = await tx.select({ id: patientVitalSigns.id }).from(patientVitalSigns).where(and(eq(patientVitalSigns.patientId, entry.patientId), isNull(patientVitalSigns.visitId))).orderBy(desc(patientVitalSigns.measuredAt)).limit(1);
      if (unlinkedMeasurement) await tx.update(patientVitalSigns).set({ visitId: created.id, updatedAt: new Date() }).where(eq(patientVitalSigns.id, unlinkedMeasurement.id));
      await tx.update(queueEntries).set({ status: 'IN_CONSULTATION', updatedAt: new Date() }).where(eq(queueEntries.id, entry.id));
      await tx.update(appointments).set({ status: 'IN_PROGRESS', updatedAt: new Date() }).where(eq(appointments.id, entry.appointmentId));
      return created;
    });
    await this.audit.log({ ...context, action: 'CONSULTATION_START', entity: 'visits', entityId: visit.id, newValue: visit });
    return visit;
  }

  async detail(id: string, user: AuthenticatedUser) {
    const [visit] = await this.db.select({ id: visits.id, appointmentId: visits.appointmentId, queueEntryId: visits.queueEntryId, patientId: visits.patientId, doctorId: visits.doctorId, status: visits.status, chiefComplaint: visits.chiefComplaint, examinationFindings: visits.examinationFindings, clinicalNote: visits.clinicalNote, treatmentNote: visits.treatmentNote, followUpNote: visits.followUpNote, followUpDate: visits.followUpDate, startedAt: visits.startedAt, completedAt: visits.completedAt, patientName: patients.fullName, mrn: patients.mrn, dateOfBirth: patients.dateOfBirth, gender: patients.gender, phone: patients.phone, bloodType: patients.bloodType, allergies: patients.allergies, doctorName: users.fullName }).from(visits).innerJoin(patients, eq(visits.patientId, patients.id)).innerJoin(doctors, eq(visits.doctorId, doctors.id)).innerJoin(users, eq(doctors.userId, users.id)).where(eq(visits.id, id)).limit(1);
    if (!visit) throw new NotFoundException('Visit not found');
    if (user.role === 'DOCTOR') { const doctor = await this.ownedDoctor(user.id); if (doctor.id !== visit.doctorId) throw new ForbiddenException('Visit is assigned to another doctor'); }
    const [currentVitals, visitDiagnosis, history, measurementHistory] = await Promise.all([
      this.db.select().from(patientVitalSigns).where(and(eq(patientVitalSigns.patientId, visit.patientId), eq(patientVitalSigns.visitId, id))).orderBy(desc(patientVitalSigns.measuredAt)).limit(1),
      this.db.select({ diagnosisId: diagnoses.id, icd10Code: diagnoses.icd10Code, name: diagnoses.name, isPrimary: visitDiagnoses.isPrimary, notes: visitDiagnoses.notes }).from(visitDiagnoses).innerJoin(diagnoses, eq(visitDiagnoses.diagnosisId, diagnoses.id)).where(eq(visitDiagnoses.visitId, id)),
      this.db.select({ id: visits.id, startedAt: visits.startedAt, chiefComplaint: visits.chiefComplaint, examinationFindings: visits.examinationFindings, status: visits.status, doctorName: users.fullName }).from(visits).innerJoin(doctors, eq(visits.doctorId, doctors.id)).innerJoin(users, eq(doctors.userId, users.id)).where(and(eq(visits.patientId, visit.patientId), ne(visits.id, id))).orderBy(desc(visits.startedAt)).limit(10),
      this.db.select().from(patientVitalSigns).where(eq(patientVitalSigns.patientId, visit.patientId)).orderBy(desc(patientVitalSigns.measuredAt)).limit(10),
    ]);
    const previousVisits = await Promise.all(history.map(async (item) => {
      const [dx, meds] = await Promise.all([
        this.db.select({ icd10Code: diagnoses.icd10Code, name: diagnoses.name, isPrimary: visitDiagnoses.isPrimary }).from(visitDiagnoses).innerJoin(diagnoses, eq(visitDiagnoses.diagnosisId, diagnoses.id)).where(eq(visitDiagnoses.visitId, item.id)),
        this.db.select({ name: medicines.name, dosage: prescriptionItems.dosage }).from(prescriptions).innerJoin(prescriptionItems, eq(prescriptions.id, prescriptionItems.prescriptionId)).innerJoin(medicines, eq(prescriptionItems.medicineId, medicines.id)).where(eq(prescriptions.visitId, item.id)),
      ]);
      return { ...item, diagnoses: dx, medicines: meds };
    }));
    return { ...visit, vitalSigns: currentVitals[0] ?? measurementHistory[0] ?? null, vitalSignsForCurrentVisit: Boolean(currentVitals[0]), diagnoses: visitDiagnosis, previousVisits, measurementHistory };
  }

  async consultation(id: string, dto: UpdateConsultationDto, user: AuthenticatedUser, context: AuditContext) {
    await this.assertOwnership(id, user);
    const [old] = await this.db.select().from(visits).where(eq(visits.id, id)).limit(1);
    const clean = Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]));
    const [updated] = await this.db.update(visits).set({ ...clean, updatedAt: new Date() }).where(eq(visits.id, id)).returning();
    await this.audit.log({ ...context, action: 'CONSULTATION_UPDATE', entity: 'visits', entityId: id, oldValue: old, newValue: updated });
    return updated;
  }

  async soap(id: string, dto: UpdateSoapDto, user: AuthenticatedUser, context: AuditContext) {
    return this.consultation(id, { chiefComplaint: dto.chiefComplaint, examinationFindings: dto.clinicalFindings ?? dto.physicalExamination, clinicalNote: dto.additionalNotes ?? dto.historyOfPresentIllness, treatmentNote: dto.treatmentPlan, followUpNote: dto.followUp }, user, context);
  }

  async vitals(id: string, dto: UpsertVitalsDto, user: AuthenticatedUser, context: AuditContext) {
    const visit = await this.assertOwnership(id, user);
    const values = { patientId: visit.patientId, visitId: id, systolicBloodPressure: dto.systolic, diastolicBloodPressure: dto.diastolic, weightKg: String(dto.weight), heightCm: String(dto.height), heartRate: dto.heartRate ?? null, respiratoryRate: dto.respiratoryRate ?? null, temperature: dto.temperature === undefined ? null : String(dto.temperature), oxygenSaturation: dto.spo2 ?? null, measuredBy: user.id, measuredAt: new Date(), updatedAt: new Date() };
    const [previous] = await this.db.select().from(patientVitalSigns).where(eq(patientVitalSigns.visitId, id)).orderBy(desc(patientVitalSigns.measuredAt)).limit(1);
    const [record] = previous ? await this.db.update(patientVitalSigns).set(values).where(eq(patientVitalSigns.id, previous.id)).returning() : await this.db.insert(patientVitalSigns).values(values).returning();
    await this.audit.log({ ...context, action: previous ? 'patient_vital_sign.updated' : 'patient_vital_sign.created', entity: 'patient_vital_signs', entityId: record.id, oldValue: previous, newValue: record });
    return record;
  }

  async diagnosis(id: string, dto: AddVisitDiagnosisDto, user: AuthenticatedUser, context: AuditContext) {
    await this.assertOwnership(id, user);
    const [valid] = await this.db.select({ id: diagnoses.id }).from(diagnoses).where(and(eq(diagnoses.id, dto.diagnosisId), eq(diagnoses.isActive, true))).limit(1);
    if (!valid) throw new BadRequestException('Diagnosis is unavailable');
    await this.db.transaction(async (tx) => { if (dto.isPrimary) await tx.update(visitDiagnoses).set({ isPrimary: false }).where(eq(visitDiagnoses.visitId, id)); await tx.insert(visitDiagnoses).values({ visitId: id, ...dto }).onConflictDoUpdate({ target: [visitDiagnoses.visitId, visitDiagnoses.diagnosisId], set: { isPrimary: dto.isPrimary, notes: dto.notes } }); });
    await this.audit.log({ ...context, action: 'DIAGNOSIS_ADD', entity: 'visits', entityId: id, newValue: dto });
    return this.detail(id, user);
  }

  async complete(id: string, user: AuthenticatedUser, context: AuditContext) {
    await this.assertOwnership(id, user);
    const [visit] = await this.db.select().from(visits).where(eq(visits.id, id)).limit(1);
    const [primaryDiagnosis, prescription] = await Promise.all([
      this.db.select({ id: visitDiagnoses.diagnosisId }).from(visitDiagnoses).where(and(eq(visitDiagnoses.visitId, id), eq(visitDiagnoses.isPrimary, true))).limit(1),
      this.db.select().from(prescriptions).where(eq(prescriptions.visitId, id)).limit(1),
    ]);
    if (!visit.chiefComplaint?.trim() || !primaryDiagnosis[0]) throw new BadRequestException('Chief complaint and a primary diagnosis are required');
    const prescriptionItemsFound = prescription[0] ? await this.db.select({ id: prescriptionItems.id }).from(prescriptionItems).where(eq(prescriptionItems.prescriptionId, prescription[0].id)) : [];
    const completed = await this.db.transaction(async (tx) => {
      const now = new Date();
      const [updated] = await tx.update(visits).set({ status: 'COMPLETED', completedAt: now, updatedAt: now }).where(eq(visits.id, id)).returning();
      if (visit.queueEntryId) await tx.update(queueEntries).set({ status: 'COMPLETED', completedAt: now, updatedAt: now }).where(eq(queueEntries.id, visit.queueEntryId));
      if (visit.appointmentId) await tx.update(appointments).set({ status: 'COMPLETED', updatedAt: now }).where(eq(appointments.id, visit.appointmentId));
      if (prescription[0]?.status === 'DRAFT' && prescriptionItemsFound.length > 0) await tx.update(prescriptions).set({ status: 'SUBMITTED', submittedAt: now, updatedAt: now }).where(eq(prescriptions.id, prescription[0].id));
      return updated;
    });
    await this.audit.log({ ...context, action: 'CONSULTATION_COMPLETE', entity: 'visits', entityId: id, oldValue: visit, newValue: completed });
    return completed;
  }

  private async assertOwnership(id: string, user: AuthenticatedUser) {
    const [visit] = await this.db.select({ doctorId: visits.doctorId, patientId: visits.patientId, status: visits.status }).from(visits).where(eq(visits.id, id)).limit(1);
    if (!visit) throw new NotFoundException('Visit not found');
    const doctor = await this.ownedDoctor(user.id);
    if (doctor.id !== visit.doctorId) throw new ForbiddenException('Visit is assigned to another doctor');
    if (visit.status !== 'IN_PROGRESS') throw new BadRequestException('Visit is not active');
    return visit;
  }
}
