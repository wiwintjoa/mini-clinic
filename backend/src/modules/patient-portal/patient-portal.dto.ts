import { IsDateString, IsOptional, IsString, IsUUID, Matches, MaxLength } from 'class-validator';
export class PatientBookAppointmentDto {
  @IsUUID() doctorId!: string;
  @IsUUID() serviceId!: string;
  @IsDateString() appointmentDate!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) startTime!: string;
  @Matches(/^([01]\d|2[0-3]):[0-5]\d$/) endTime!: string;
  @IsOptional() @IsString() @MaxLength(1000) notes?: string;
}
