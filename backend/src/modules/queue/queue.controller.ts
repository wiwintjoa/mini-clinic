import { Body, Controller, Get, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import type { AuditContext } from '../audit/audit.service';
import { CheckInDto, QueueListQueryDto, UpdateQueueStatusDto } from './queue.dto';
import { QueueService } from './queue.service';

@Controller('queue')
export class QueueController {
  constructor(private readonly queue: QueueService) {}
  @Get() list(@Query() query: QueueListQueryDto, @CurrentUser() user: AuthenticatedUser) { return this.queue.list(query, user); }
  @Post('check-in/:appointmentId') @RequirePermissions('QUEUE_MANAGE_ANY') checkIn(@Param('appointmentId', ParseUUIDPipe) id: string, @Body() dto: CheckInDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.queue.checkIn(id, dto, this.context(user, request)); }
  @Patch(':id/status') update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateQueueStatusDto, @CurrentUser() user: AuthenticatedUser, @Req() request: Request) { return this.queue.update(id, dto, user, this.context(user, request)); }
  private context(user: AuthenticatedUser, request: Request): AuditContext { return { userId: user.id, ipAddress: request.ip, userAgent: request.headers['user-agent'] }; }
}
