import { Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsInt, IsNumber, IsOptional, IsString, IsUUID, Max, MaxLength, Min } from 'class-validator';

export class UpdateConsultationDto {
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(5000) examinationFindings?: string;
  @IsOptional() @IsString() @MaxLength(5000) clinicalNote?: string;
  @IsOptional() @IsString() @MaxLength(5000) treatmentNote?: string;
  @IsOptional() @IsString() @MaxLength(2000) followUpNote?: string;
  @IsOptional() @IsDateString() followUpDate?: string;
}

export class UpdateSoapDto {
  @IsOptional() @IsString() @MaxLength(2000) chiefComplaint?: string;
  @IsOptional() @IsString() @MaxLength(5000) historyOfPresentIllness?: string;
  @IsOptional() @IsString() @MaxLength(5000) physicalExamination?: string;
  @IsOptional() @IsString() @MaxLength(5000) clinicalFindings?: string;
  @IsOptional() @IsString() @MaxLength(5000) treatmentPlan?: string;
  @IsOptional() @IsString() @MaxLength(2000) followUp?: string;
  @IsOptional() @IsString() @MaxLength(5000) additionalNotes?: string;
}

export class UpsertVitalsDto {
  @Type(() => Number) @IsInt() @Min(40) @Max(300) systolic!: number;
  @Type(() => Number) @IsInt() @Min(20) @Max(200) diastolic!: number;
  @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) weight!: number;
  @Type(() => Number) @IsNumber() @Min(1) @Max(250) height!: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(250) heartRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(80) respiratoryRate?: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(30) @Max(45) temperature?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) spo2?: number;
}

export class AddVisitDiagnosisDto { @IsUUID() diagnosisId!: string; @IsBoolean() isPrimary = false; @IsOptional() @IsString() @MaxLength(1000) notes?: string; }
