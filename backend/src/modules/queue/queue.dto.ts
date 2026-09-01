import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsOptional, ValidateNested } from 'class-validator';
import { PatientMeasurementDto } from '../patients/patient.dto';

export class QueueListQueryDto { @IsOptional() @IsDateString() date?: string; }
export class UpdateQueueStatusDto { @IsIn(['CALLED', 'IN_CONSULTATION', 'COMPLETED', 'SKIPPED', 'CANCELLED']) status!: 'CALLED'|'IN_CONSULTATION'|'COMPLETED'|'SKIPPED'|'CANCELLED'; }
export class CheckInDto { @IsOptional() @ValidateNested() @Type(() => PatientMeasurementDto) measurement?: PatientMeasurementDto; }
