import { Type } from 'class-transformer';
import { IsIn, IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class BillingListQueryDto {
  @Type(() => Number) @IsInt() @Min(1) page = 1;
  @Type(() => Number) @IsInt() @Min(1) @Max(100) limit = 20;
  @IsOptional() @IsString() @MaxLength(100) search?: string;
  @IsOptional() @IsIn(['invoiceDate', 'invoiceNumber', 'grandTotal']) sortBy: 'invoiceDate' | 'invoiceNumber' | 'grandTotal' = 'invoiceDate';
  @IsOptional() @IsIn(['asc', 'desc']) sortDirection: 'asc' | 'desc' = 'desc';
}

export class GenerateInvoiceDto {
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) discount = 0;
  @Type(() => Number) @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) tax = 0;
}
