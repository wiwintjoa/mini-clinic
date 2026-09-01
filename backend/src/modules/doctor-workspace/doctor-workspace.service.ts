import { ForbiddenException, Inject, Injectable } from '@nestjs/common';
import { desc, eq } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { diagnoses, visitDiagnoses, visits } from '../../database/schema/clinical';
import { doctors } from '../../database/schema/operations';
import { medicines, prescriptionItems, prescriptions } from '../../database/schema/prescribing';
import { users } from '../../database/schema';

@Injectable()
export class DoctorWorkspaceService {
  constructor(@Inject(DATABASE) private readonly db: Database) {}
  async patientHistory(patientId:string,userId:string){const[doctor]=await this.db.select({id:doctors.id}).from(doctors).where(eq(doctors.userId,userId)).limit(1);if(!doctor)throw new ForbiddenException('Doctor profile is unavailable');const history=await this.db.select({id:visits.id,startedAt:visits.startedAt,status:visits.status,chiefComplaint:visits.chiefComplaint,examinationFindings:visits.examinationFindings,doctorName:users.fullName}).from(visits).innerJoin(doctors,eq(visits.doctorId,doctors.id)).innerJoin(users,eq(doctors.userId,users.id)).where(eq(visits.patientId,patientId)).orderBy(desc(visits.startedAt)).limit(20);return Promise.all(history.map(async item=>{const[visitDx,meds]=await Promise.all([this.db.select({icd10Code:diagnoses.icd10Code,name:diagnoses.name,isPrimary:visitDiagnoses.isPrimary}).from(visitDiagnoses).innerJoin(diagnoses,eq(visitDiagnoses.diagnosisId,diagnoses.id)).where(eq(visitDiagnoses.visitId,item.id)),this.db.select({name:medicines.name,dosage:prescriptionItems.dosage}).from(prescriptions).innerJoin(prescriptionItems,eq(prescriptions.id,prescriptionItems.prescriptionId)).innerJoin(medicines,eq(prescriptionItems.medicineId,medicines.id)).where(eq(prescriptions.visitId,item.id))]);return{...item,diagnoses:visitDx,medicines:meds};}));}
}
