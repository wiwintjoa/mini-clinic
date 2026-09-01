import { Body, Controller, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuditContext } from '../audit/audit.service';
import { CreatePatientAccountDto } from './user.dto';
import { UsersService } from './users.service';
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}
  @Post('patient-accounts') @RequirePermissions('USER_MANAGE') createPatientAccount(@Body() dto: CreatePatientAccountDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { const context: AuditContext = { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; return this.users.createPatientAccount(dto, context); }
}
