import { Controller, Get } from '@nestjs/common';
import type { AuthenticatedUser } from '../../common/auth/auth.types';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { DashboardService } from './dashboard.service';
@Controller('dashboard')
export class DashboardController { constructor(private readonly dashboard: DashboardService) {} @Get() get(@CurrentUser() user: AuthenticatedUser) { return this.dashboard.get(user); } }
