import { Body, Controller, Get, Param, ParseUUIDPipe, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuditContext } from '../audit/audit.service';
import { BillingListQueryDto, GenerateInvoiceDto } from './billing.dto';
import { BillingService } from './billing.service';

@Controller('billing')
export class BillingController {
  constructor(private readonly billing: BillingService) {}
  @Get() @RequirePermissions('BILLING_CREATE') list(@Query() query: BillingListQueryDto) { return this.billing.list(query); }
  @Get('unbilled-visits') @RequirePermissions('BILLING_CREATE') unbilledVisits() { return this.billing.unbilledVisits(); }
  @Get(':id') @RequirePermissions('BILLING_CREATE') detail(@Param('id', ParseUUIDPipe) id: string) { return this.billing.detail(id); }
  @Post('visits/:visitId/invoice') @RequirePermissions('BILLING_CREATE') generate(@Param('visitId', ParseUUIDPipe) id: string, @Body() dto: GenerateInvoiceDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.billing.generate(id, dto, this.context(user, request)); }
  private context(user: AuthenticatedUser, request: Request): AuditContext { return { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
}
