import { IsDateString, IsOptional, IsUUID } from 'class-validator';
export class ReportFilterDto {
  @IsOptional() @IsDateString() dateFrom?: string;
  @IsOptional() @IsDateString() dateTo?: string;
  @IsOptional() @IsUUID() doctorId?: string;
  @IsOptional() @IsUUID() serviceId?: string;
}
export const reportTypes = ['daily-patients', 'revenue', 'doctors', 'pharmacy', 'inventory', 'appointments', 'cancellations'] as const;
export type ReportType = typeof reportTypes[number];
