import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { and, asc, eq, ilike, inArray, or } from 'drizzle-orm';
import { DATABASE, Database } from '../../database/database.module';
import { medicines, prescriptions } from '../../database/schema/prescribing';
import { patients } from '../../database/schema/patients';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { AuditContext, AuditService } from '../audit/audit.service';
import { DispensingService } from '../inventory/inventory.service';
import { PrescriptionsService } from '../prescriptions/prescriptions.service';

@Injectable()
export class PharmacyService {
  constructor(@Inject(DATABASE) private readonly db:Database,private readonly prescriptionService:PrescriptionsService,private readonly dispensing:DispensingService,private readonly audit:AuditService){}
  medicines(search=''){const term=search.trim();return this.db.select().from(medicines).where(and(eq(medicines.isActive,true),term?or(ilike(medicines.code,`%${term}%`),ilike(medicines.name,`%${term}%`),ilike(medicines.genericName,`%${term}%`)):undefined)).orderBy(asc(medicines.name)).limit(50);}
  queue(){return this.db.select({id:prescriptions.id,prescriptionNumber:prescriptions.prescriptionNumber,status:prescriptions.status,submittedAt:prescriptions.submittedAt,patientName:patients.fullName,mrn:patients.mrn}).from(prescriptions).innerJoin(patients,eq(prescriptions.patientId,patients.id)).where(inArray(prescriptions.status,['SUBMITTED','PROCESSING','READY'])).orderBy(asc(prescriptions.submittedAt));}
  detail(id:string,user:AuthenticatedUser){return this.prescriptionService.detail(id,user);}
  async process(id:string,context:AuditContext){const updated=await this.transition(id,'SUBMITTED','PROCESSING');await this.audit.log({...context,action:'PRESCRIPTION_PROCESS',entity:'prescriptions',entityId:id,newValue:updated});return updated;}
  async ready(id:string,context:AuditContext){const updated=await this.transition(id,'PROCESSING','READY');await this.audit.log({...context,action:'PRESCRIPTION_READY',entity:'prescriptions',entityId:id,newValue:updated});return updated;}
  dispense(id:string,context:AuditContext){return this.dispensing.dispense(id,context);}
  private async transition(id:string,from:'SUBMITTED'|'PROCESSING',to:'PROCESSING'|'READY'){const[p]=await this.db.select().from(prescriptions).where(eq(prescriptions.id,id)).limit(1);if(!p||p.status!==from)throw new BadRequestException(`Prescription must be ${from}`);const[updated]=await this.db.update(prescriptions).set({status:to,updatedAt:new Date()}).where(eq(prescriptions.id,id)).returning();return updated;}
}
