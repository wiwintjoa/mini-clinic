import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module';
import { AuditModule } from '../audit/audit.module';
import { PatientPortalController } from './patient-portal.controller';
import { PatientPortalService } from './patient-portal.service';
@Module({ imports: [AppointmentsModule, AuditModule], controllers: [PatientPortalController], providers: [PatientPortalService] })
export class PatientPortalModule {}
