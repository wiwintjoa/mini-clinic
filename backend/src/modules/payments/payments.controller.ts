import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuditContext } from '../audit/audit.service';
import { CreatePaymentDto } from './payment.dto';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}
  @Post() @RequirePermissions('PAYMENT_CREATE') create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.payments.create(dto, this.context(user, request)); }
  private context(user: AuthenticatedUser, request: Request): AuditContext { return { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
}
