import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import type { Response } from 'express';
import { RequirePermissions } from '../../common/auth/permissions.decorator';
import { ReportFilterDto } from './reports.dto';
import { ReportsService } from './reports.service';
@Controller('reports')
@RequirePermissions('REPORT_READ')
export class ReportsController {
  constructor(private readonly reports: ReportsService) {}
  @Get(':type/export') async export(@Param('type') type: string, @Query() filter: ReportFilterDto, @Res() response: Response) { const report = await this.reports.run(type, filter); response.setHeader('Content-Type', 'text/csv; charset=utf-8'); response.setHeader('Content-Disposition', `attachment; filename="${type}-${new Date().toISOString().slice(0, 10)}.csv"`); response.send(`\uFEFF${this.reports.toCsv(report)}`); }
  @Get(':type') run(@Param('type') type: string, @Query() filter: ReportFilterDto) { return this.reports.run(type, filter); }
}
