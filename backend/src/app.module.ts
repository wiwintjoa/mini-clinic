import { Controller, Get, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { Public } from './common/auth/public.decorator';
import { JwtAuthGuard } from './common/auth/jwt-auth.guard';
import { PermissionsGuard } from './common/auth/permissions.guard';
import { validateEnvironment } from './config/env';
import { DatabaseModule } from './database/database.module';
import { AuthModule } from './modules/auth/auth.module';import { UsersModule } from './modules/users/users.module';import { PatientsModule } from './modules/patients/patients.module';import { DoctorsModule } from './modules/doctors/doctors.module';import { ServicesModule } from './modules/services/services.module';import { AppointmentsModule } from './modules/appointments/appointments.module';import { QueueModule } from './modules/queue/queue.module';import { VisitsModule } from './modules/visits/visits.module';import { DiagnosesModule } from './modules/diagnoses/diagnoses.module';import { PrescriptionsModule } from './modules/prescriptions/prescriptions.module';import { PharmacyModule } from './modules/pharmacy/pharmacy.module';import { InventoryModule } from './modules/inventory/inventory.module';import { BillingModule } from './modules/billing/billing.module';import { PaymentsModule } from './modules/payments/payments.module';import { PatientPortalModule } from './modules/patient-portal/patient-portal.module';import { ReportsModule } from './modules/reports/reports.module';import { DashboardModule } from './modules/dashboard/dashboard.module';import { DoctorWorkspaceModule } from './modules/doctor-workspace/doctor-workspace.module';
@Controller()class HealthController{@Public()@Get('health')health(){return{status:'ok',timestamp:new Date().toISOString()};}}
@Module({imports:[ConfigModule.forRoot({isGlobal:true,validate:validateEnvironment}),ThrottlerModule.forRoot([{ttl:60_000,limit:100}]),JwtModule.register({global:true}),DatabaseModule,UsersModule,AuthModule,PatientsModule,DoctorsModule,ServicesModule,AppointmentsModule,QueueModule,VisitsModule,DiagnosesModule,PrescriptionsModule,PharmacyModule,InventoryModule,BillingModule,PaymentsModule,PatientPortalModule,ReportsModule,DashboardModule,DoctorWorkspaceModule],controllers:[HealthController],providers:[{provide:APP_GUARD,useClass:ThrottlerGuard},{provide:APP_GUARD,useClass:JwtAuthGuard},{provide:APP_GUARD,useClass:PermissionsGuard}]})
export class AppModule{}
