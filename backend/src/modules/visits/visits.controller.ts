import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Put, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import type { AuditContext } from '../audit/audit.service';
import { AddVisitDiagnosisDto, UpdateConsultationDto, UpdateSoapDto, UpsertVitalsDto } from './visit.dto';
import { VisitsService } from './visits.service';

@Controller('visits')
export class VisitsController {
  constructor(private readonly visits: VisitsService) {}
  @Post('from-queue/:queueId') @RequirePermissions('VISIT_CREATE') start(@Param('queueId', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.visits.start(id, user, this.context(user, request)); }
  @Get(':id') @RequirePermissions('VISIT_READ_ANY') detail(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) { return this.visits.detail(id, user); }
  @Patch(':id/consultation') @RequirePermissions('VISIT_CREATE') consultation(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateConsultationDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.visits.consultation(id, dto, user, this.context(user, request)); }
  @Patch(':id/soap') @RequirePermissions('VISIT_CREATE') soap(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateSoapDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.visits.soap(id, dto, user, this.context(user, request)); }
  @Put(':id/vitals') @RequirePermissions('VISIT_CREATE') vitals(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpsertVitalsDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.visits.vitals(id, dto, user, this.context(user, request)); }
  @Post(':id/diagnoses') @RequirePermissions('DIAGNOSIS_CREATE') diagnosis(@Param('id', ParseUUIDPipe) id: string, @Body() dto: AddVisitDiagnosisDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.visits.diagnosis(id, dto, user, this.context(user, request)); }
  @Post(':id/complete') @RequirePermissions('VISIT_CREATE') complete(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.visits.complete(id, user, this.context(user, request)); }
  private context(user: AuthenticatedUser, request: Request): AuditContext { return { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
}
