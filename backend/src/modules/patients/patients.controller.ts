import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import type { AuditContext } from '../audit/audit.service';
import { CreatePatientDto, DuplicatePatientQueryDto, PatientListQueryDto, PatientMeasurementDto, UpdatePatientDto, VitalSignsHistoryQueryDto } from './patient.dto';
import { PatientsService } from './patients.service';

@Controller('patients')
export class PatientsController {
  constructor(private readonly patients: PatientsService) {}
  @Get() @RequirePermissions('PATIENT_READ_ANY') list(@Query() query: PatientListQueryDto) { return this.patients.list(query); }
  @Get('duplicates') @RequirePermissions('PATIENT_READ_ANY') duplicates(@Query() query: DuplicatePatientQueryDto) { return this.patients.possibleDuplicates(query); }
  @Get(':id') @RequirePermissions('PATIENT_READ_ANY') get(@Param('id', ParseUUIDPipe) id: string) { return this.patients.get(id); }
  @Get(':id/vital-signs') @RequirePermissions('PATIENT_READ_ANY') vitalSigns(@Param('id', ParseUUIDPipe) id: string, @Query() query: VitalSignsHistoryQueryDto) { return this.patients.vitalSigns(id, query); }
  @Post() @RequirePermissions('PATIENT_CREATE') create(@Body() dto: CreatePatientDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.patients.create(dto, this.context(user, request)); }
  @Patch(':id') @RequirePermissions('PATIENT_UPDATE') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdatePatientDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.patients.update(id, dto, this.context(user, request)); }
  @Post(':id/vital-signs') @RequirePermissions('PATIENT_READ_ANY') addVitalSigns(@Param('id', ParseUUIDPipe) id: string, @Body() dto: PatientMeasurementDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.patients.addVitalSigns(id, dto, this.context(user, request)); }
  @Patch(':id/vital-signs/:measurementId') @RequirePermissions('PATIENT_UPDATE') correctVitalSigns(@Param('id', ParseUUIDPipe) id: string, @Param('measurementId', ParseUUIDPipe) measurementId: string, @Body() dto: PatientMeasurementDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.patients.correctVitalSigns(id, measurementId, dto, this.context(user, request)); }
  private context(user: AuthenticatedUser, request: Request): AuditContext { return { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
}
