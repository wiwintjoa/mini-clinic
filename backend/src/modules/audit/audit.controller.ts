import { Controller, Get, Query } from '@nestjs/common';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { AuditListQueryDto } from './audit.dto';
import { AuditService } from './audit.service';
@Controller('audit')
export class AuditController { constructor(private readonly audit: AuditService) {} @Get() @RequirePermissions('AUDIT_READ') list(@Query() query: AuditListQueryDto) { return this.audit.list(query); } }
