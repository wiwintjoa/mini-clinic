import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { and, asc, count, desc, eq, ilike, or, sql } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { patientVitalSigns, mrnCounters, patients } from '../../database/schema/patients';
import { visits } from '../../database/schema/clinical';
import { postgresErrorCode } from '../../database/postgres-error';
import { AuditContext, AuditService } from '../audit/audit.service';
import { CreatePatientDto, DuplicatePatientQueryDto, PatientListQueryDto, PatientMeasurementDto, UpdatePatientDto, VitalSignsHistoryQueryDto } from './patient.dto';
import { formatMrn } from './mrn';

@Injectable()
export class PatientsService {
  constructor(@Inject(DATABASE) private readonly db: Database, private readonly audit: AuditService) {}

  async list(query: PatientListQueryDto) {
    const term = query.search?.trim();
    const where = term ? or(ilike(patients.mrn, `%${term}%`), ilike(patients.fullName, `%${term}%`), ilike(patients.nik, `%${term}%`), ilike(patients.phone, `%${term}%`)) : undefined;
    const columns = { mrn: patients.mrn, fullName: patients.fullName, dateOfBirth: patients.dateOfBirth, createdAt: patients.createdAt, status: patients.status };
    const direction = query.sortDirection === 'asc' ? asc : desc;
    const [rows, totals] = await Promise.all([
      this.db.select().from(patients).where(where).orderBy(direction(columns[query.sortBy])).limit(query.limit).offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(patients).where(where),
    ]);
    const total = totals[0]?.value ?? 0;
    return { data: rows, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async get(id: string) {
    const [patient] = await this.db.select().from(patients).where(eq(patients.id, id)).limit(1);
    if (!patient) throw new NotFoundException('Patient not found');
    const [latestMeasurement] = await this.db.select().from(patientVitalSigns).where(eq(patientVitalSigns.patientId, id)).orderBy(desc(patientVitalSigns.measuredAt)).limit(1);
    return { ...patient, latestMeasurement: latestMeasurement ?? null };
  }

  async possibleDuplicates(query: DuplicatePatientQueryDto) {
    const conditions = [];
    if (query.nik) conditions.push(eq(patients.nik, query.nik));
    if (query.phone?.trim()) conditions.push(eq(patients.phone, query.phone.trim()));
    if (query.fullName?.trim() && query.dateOfBirth) conditions.push(and(ilike(patients.fullName, query.fullName.trim()), eq(patients.dateOfBirth, query.dateOfBirth))!);
    if (conditions.length === 0) return [];
    return this.db.select({ id: patients.id, mrn: patients.mrn, fullName: patients.fullName, dateOfBirth: patients.dateOfBirth, phone: patients.phone }).from(patients).where(or(...conditions)).limit(10);
  }

  async create(dto: CreatePatientDto, context: AuditContext) {
    this.assertDateOfBirth(dto.dateOfBirth);
    try {
      const result = await this.db.transaction(async (tx) => {
        const [counter] = await tx.update(mrnCounters).set({ nextValue: 2 }).where(and(eq(mrnCounters.clinicCode, 'CLN'), eq(mrnCounters.nextValue, 1))).returning({ allocated: mrnCounters.nextValue });
        let allocated: number;
        if (counter) allocated = 1;
        else {
          const [next] = await tx.update(mrnCounters).set({ nextValue: sql`next_value + 1` }).where(eq(mrnCounters.clinicCode, 'CLN')).returning({ nextValue: mrnCounters.nextValue });
          if (!next) throw new Error('MRN counter is unavailable');
          allocated = next.nextValue - 1;
        }
        const master = this.masterValues(dto);
        const [patient] = await tx.insert(patients).values({ ...master, mrn: formatMrn(allocated) }).returning();
        const [measurement] = await tx.insert(patientVitalSigns).values(this.measurementValues(patient.id, dto.initialMeasurement, context.userId)).returning();
        return { patient, measurement };
      });
      await Promise.all([
        this.audit.log({ ...context, action: 'patient.created', entity: 'patients', entityId: result.patient.id, newValue: result.patient }),
        this.audit.log({ ...context, action: 'patient_vital_sign.created', entity: 'patient_vital_signs', entityId: result.measurement.id, newValue: result.measurement }),
      ]);
      return { ...result.patient, latestMeasurement: result.measurement };
    } catch (error) { this.handleConstraint(error); }
  }

  async update(id: string, dto: UpdatePatientDto, context: AuditContext) {
    if (dto.dateOfBirth) this.assertDateOfBirth(dto.dateOfBirth);
    const previous = await this.get(id);
    try {
      const [patient] = await this.db.update(patients).set({ ...this.clean(dto), updatedAt: new Date() }).where(eq(patients.id, id)).returning();
      await this.audit.log({ ...context, action: 'patient.updated', entity: 'patients', entityId: id, oldValue: previous, newValue: patient });
      return patient;
    } catch (error) { this.handleConstraint(error); }
  }

  async vitalSigns(patientId: string, query: VitalSignsHistoryQueryDto) {
    await this.assertPatient(patientId);
    const where = eq(patientVitalSigns.patientId, patientId);
    const [data, totals] = await Promise.all([
      this.db.select({ id: patientVitalSigns.id, patientId: patientVitalSigns.patientId, visitId: patientVitalSigns.visitId, systolicBloodPressure: patientVitalSigns.systolicBloodPressure, diastolicBloodPressure: patientVitalSigns.diastolicBloodPressure, weightKg: patientVitalSigns.weightKg, heightCm: patientVitalSigns.heightCm, temperature: patientVitalSigns.temperature, heartRate: patientVitalSigns.heartRate, respiratoryRate: patientVitalSigns.respiratoryRate, oxygenSaturation: patientVitalSigns.oxygenSaturation, measuredAt: patientVitalSigns.measuredAt, measuredBy: patientVitalSigns.measuredBy, visitNumber: visits.id }).from(patientVitalSigns).leftJoin(visits, eq(patientVitalSigns.visitId, visits.id)).where(where).orderBy(desc(patientVitalSigns.measuredAt)).limit(query.limit).offset((query.page - 1) * query.limit),
      this.db.select({ value: count() }).from(patientVitalSigns).where(where),
    ]);
    const total = totals[0]?.value ?? 0;
    return { data, meta: { page: query.page, limit: query.limit, total, totalPages: Math.ceil(total / query.limit) } };
  }

  async addVitalSigns(patientId: string, dto: PatientMeasurementDto, context: AuditContext) {
    await this.assertPatient(patientId);
    if (dto.visitId) {
      const [visit] = await this.db.select({ patientId: visits.patientId }).from(visits).where(eq(visits.id, dto.visitId)).limit(1);
      if (!visit) throw new NotFoundException('Visit not found');
      if (visit.patientId !== patientId) throw new BadRequestException('Visit does not belong to this patient');
    }
    const [record] = await this.db.insert(patientVitalSigns).values(this.measurementValues(patientId, dto, context.userId)).returning();
    await this.audit.log({ ...context, action: 'patient_vital_sign.created', entity: 'patient_vital_signs', entityId: record.id, newValue: record });
    return record;
  }

  async correctVitalSigns(patientId: string, measurementId: string, dto: PatientMeasurementDto, context: AuditContext) {
    await this.assertPatient(patientId);
    const [previous] = await this.db.select().from(patientVitalSigns).where(and(eq(patientVitalSigns.id, measurementId), eq(patientVitalSigns.patientId, patientId))).limit(1);
    if (!previous) throw new NotFoundException('Measurement not found');
    const [record] = await this.db.update(patientVitalSigns).set({ ...this.measurementValues(patientId, dto, context.userId), updatedAt: new Date() }).where(eq(patientVitalSigns.id, measurementId)).returning();
    await this.audit.log({ ...context, action: 'patient_vital_sign.updated', entity: 'patient_vital_signs', entityId: record.id, oldValue: previous, newValue: record });
    return record;
  }

  private masterValues(dto: CreatePatientDto) {
    return this.clean({ fullName: dto.fullName, nik: dto.nik, dateOfBirth: dto.dateOfBirth, gender: dto.gender, phone: dto.phone, email: dto.email, address: dto.address, bloodType: dto.bloodType, status: dto.status, emergencyContactName: dto.emergencyContact?.name, emergencyContactPhone: dto.emergencyContact?.phone, emergencyContactRelationship: dto.emergencyContact?.relationship, paymentType: dto.payment.type, insuranceProvider: dto.payment.insuranceProvider, insuranceMemberNumber: dto.payment.insuranceMemberNumber });
  }

  private measurementValues(patientId: string, dto: PatientMeasurementDto, measuredBy: string) {
    return { patientId, visitId: dto.visitId ?? null, systolicBloodPressure: dto.systolicBloodPressure, diastolicBloodPressure: dto.diastolicBloodPressure, weightKg: String(dto.weightKg), heightCm: String(dto.heightCm), temperature: dto.temperature === undefined ? null : String(dto.temperature), heartRate: dto.heartRate ?? null, respiratoryRate: dto.respiratoryRate ?? null, oxygenSaturation: dto.oxygenSaturation ?? null, measuredBy, measuredAt: new Date() };
  }

  private clean<T extends object>(dto: T) { return Object.fromEntries(Object.entries(dto).map(([key, value]) => [key, typeof value === 'string' ? value.trim() || null : value]).filter(([, value]) => value !== undefined)); }
  private assertDateOfBirth(value: string) { if (new Date(`${value}T00:00:00Z`) > new Date()) throw new BadRequestException('Date of birth cannot be in the future'); }
  private async assertPatient(id: string) { const [row] = await this.db.select({ id: patients.id }).from(patients).where(eq(patients.id, id)).limit(1); if (!row) throw new NotFoundException('Patient not found'); }
  private handleConstraint(error: unknown): never { if (postgresErrorCode(error) === '23505') throw new ConflictException('A patient with this NIK already exists'); throw error; }
}
