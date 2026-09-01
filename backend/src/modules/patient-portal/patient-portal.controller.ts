import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuditContext } from '../audit/audit.service';
import { PatientBookAppointmentDto } from './patient-portal.dto';
import { PatientPortalService } from './patient-portal.service';

@Controller('patient-portal')
export class PatientPortalController {
  constructor(private readonly portal: PatientPortalService) {}
  @Get('profile') @RequirePermissions('PATIENT_READ_SELF') profile(@CurrentUser() user: AuthenticatedUser) { return this.portal.profile(user.id); }
  @Get('dashboard') @RequirePermissions('PATIENT_READ_SELF') dashboard(@CurrentUser() user: AuthenticatedUser) { return this.portal.dashboard(user.id); }
  @Get('references') @RequirePermissions('APPOINTMENT_MANAGE_SELF') references() { return this.portal.references(); }
  @Get('appointments') @RequirePermissions('APPOINTMENT_MANAGE_SELF') appointments(@CurrentUser() user: AuthenticatedUser) { return this.portal.appointments(user.id); }
  @Post('appointments') @RequirePermissions('APPOINTMENT_MANAGE_SELF') book(@Body() dto: PatientBookAppointmentDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.portal.book(user.id, dto, this.context(user, request)); }
  @Post('appointments/:id/cancel') @RequirePermissions('APPOINTMENT_MANAGE_SELF') cancel(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.portal.cancel(user.id, id, this.context(user, request)); }
  @Get('queue') @RequirePermissions('PATIENT_READ_SELF') queue(@CurrentUser() user: AuthenticatedUser) { return this.portal.queue(user.id); }
  @Get('history') @RequirePermissions('VISIT_READ_SELF') history(@CurrentUser() user: AuthenticatedUser) { return this.portal.history(user.id); }
  @Get('prescriptions') @RequirePermissions('VISIT_READ_SELF') prescriptions(@CurrentUser() user: AuthenticatedUser) { return this.portal.prescriptions(user.id); }
  @Get('invoices') @RequirePermissions('BILLING_READ_SELF') invoices(@CurrentUser() user: AuthenticatedUser) { return this.portal.invoices(user.id); }
  @Get('invoices/:id') @RequirePermissions('BILLING_READ_SELF') invoice(@Param('id', ParseUUIDPipe) id: string, @CurrentUser() user: AuthenticatedUser) { return this.portal.invoice(user.id, id); }
  private context(user: AuthenticatedUser, request: Request): AuditContext { return { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
}
