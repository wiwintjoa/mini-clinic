import { IsEmail, IsString, IsUUID, MaxLength, MinLength } from 'class-validator';
export class CreatePatientAccountDto {
  @IsUUID() patientId!: string;
  @IsEmail() @MaxLength(320) email!: string;
  @IsString() @MinLength(12) @MaxLength(128) password!: string;
}
