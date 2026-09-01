import { Module } from '@nestjs/common';
import { AuditModule } from '../audit/audit.module';
import { InventoryModule } from '../inventory/inventory.module';
import { PrescriptionsModule } from '../prescriptions/prescriptions.module';
import { PharmacyController } from './pharmacy.controller';
import { PharmacyService } from './pharmacy.service';
@Module({imports:[PrescriptionsModule,InventoryModule,AuditModule],controllers:[PharmacyController],providers:[PharmacyService]})export class PharmacyModule{}
