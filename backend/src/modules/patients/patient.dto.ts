import { Type } from 'class-transformer';
import { IsDateString, IsEmail, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Matches, Max, MaxLength, Min, MinLength, ValidateNested } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export class PatientMeasurementDto {
  @Type(() => Number) @IsInt() @Min(40) @Max(300) systolicBloodPressure!: number;
  @Type(() => Number) @IsInt() @Min(20) @Max(200) diastolicBloodPressure!: number;
  @Type(() => Number) @IsNumber() @Min(0.1) @Max(500) weightKg!: number;
  @Type(() => Number) @IsNumber() @Min(1) @Max(250) heightCm!: number;
  @IsOptional() @Type(() => Number) @IsNumber() @Min(30) @Max(45) temperature?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(20) @Max(250) heartRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(5) @Max(80) respiratoryRate?: number;
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(100) oxygenSaturation?: number;
  @IsOptional() @IsUUID() visitId?: string;
}

export class EmergencyContactDto {
  @IsOptional() @IsString() @MaxLength(150) name?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsIn(['SPOUSE', 'PARENT', 'CHILD', 'SIBLING', 'RELATIVE', 'FRIEND', 'OTHER']) relationship?: string;
}

export class PatientPaymentDto {
  @IsIn(['SELF_PAY', 'INSURANCE', 'COMPANY', 'OTHER']) type!: string;
  @IsOptional() @IsString() @MaxLength(150) insuranceProvider?: string;
  @IsOptional() @IsString() @MaxLength(100) insuranceMemberNumber?: string;
}

export class PatientMasterDto {
  @IsString() @MinLength(2) @MaxLength(150) fullName!: string;
  @IsOptional() @Matches(/^\d{16}$/, { message: 'NIK must contain exactly 16 digits' }) nik?: string;
  @IsDateString() dateOfBirth!: string;
  @IsIn(['MALE', 'FEMALE', 'OTHER']) gender!: 'MALE' | 'FEMALE' | 'OTHER';
  @IsString() @MinLength(8) @MaxLength(30) phone!: string;
  @IsOptional() @IsEmail() @MaxLength(254) email?: string;
  @IsString() @MinLength(5) @MaxLength(500) address!: string;
  @IsOptional() @IsIn(['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A', 'B', 'AB', 'O', 'UNKNOWN']) bloodType?: string;
  @IsOptional() @IsIn(['ACTIVE', 'INACTIVE']) status?: 'ACTIVE' | 'INACTIVE';
}

export class CreatePatientDto extends PatientMasterDto {
  @ValidateNested() @Type(() => EmergencyContactDto) emergencyContact!: EmergencyContactDto;
  @ValidateNested() @Type(() => PatientPaymentDto) payment!: PatientPaymentDto;
  @ValidateNested() @Type(() => PatientMeasurementDto) initialMeasurement!: PatientMeasurementDto;
}

export class UpdatePatientDto extends PartialType(PatientMasterDto) {
  @IsOptional() @IsString() @MaxLength(150) emergencyContactName?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactPhone?: string;
  @IsOptional() @IsString() @MaxLength(30) emergencyContactRelationship?: string;
  @IsOptional() @IsIn(['SELF_PAY', 'INSURANCE', 'COMPANY', 'OTHER']) paymentType?: string;
  @IsOptional() @IsString() @MaxLength(150) insuranceProvider?: string;
  @IsOptional() @IsString() @MaxLength(100) insuranceMemberNumber?: string;
}

export class PatientListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['mrn', 'fullName', 'dateOfBirth', 'createdAt', 'status']) sortBy: 'mrn'|'fullName'|'dateOfBirth'|'createdAt'|'status' = 'createdAt';
  @IsOptional() @IsIn(['asc', 'desc']) sortDirection: 'asc'|'desc' = 'desc';
}

export class DuplicatePatientQueryDto {
  @IsOptional() @Matches(/^\d{16}$/) nik?: string;
  @IsOptional() @IsString() @MaxLength(30) phone?: string;
  @IsOptional() @IsString() @MaxLength(150) fullName?: string;
  @IsOptional() @IsDateString() dateOfBirth?: string;
}

export class VitalSignsHistoryQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
}
