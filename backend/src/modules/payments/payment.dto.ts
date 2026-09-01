import { Type } from 'class-transformer';
import { IsIn, IsNumber, IsOptional, IsString, IsUUID, MaxLength, Min } from 'class-validator';

export class CreatePaymentDto {
  @IsUUID() invoiceId!: string;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) amount!: number;
  @IsIn(['CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'QRIS', 'INSURANCE']) method!: 'CASH' | 'DEBIT_CARD' | 'CREDIT_CARD' | 'BANK_TRANSFER' | 'QRIS' | 'INSURANCE';
  @IsOptional() @IsString() @MaxLength(200) reference?: string;
}
