import { IsEnum, IsNotEmpty, IsString, IsInt, Min, IsOptional, IsObject, Validate, ValidatorConstraint, ValidatorConstraintInterface, ValidationArguments } from 'class-validator';
import { FinancialReportType } from '@prisma/client';

@ValidatorConstraint({ name: 'AtLeastOneRequired', async: false })
class AtLeastOneRequiredConstraint implements ValidatorConstraintInterface {
  validate(_value: unknown, args: ValidationArguments) {
    const obj = args.object as CreateFinancialReportDto;
    return !!(obj.data || obj.storageKey);
  }

  defaultMessage() {
    return 'Either data or storageKey must be provided';
  }
}

export class CreateFinancialReportDto {
  @IsEnum(FinancialReportType)
  @IsNotEmpty()
  type: FinancialReportType;

  @IsInt()
  @Min(1900)
  @IsNotEmpty()
  fiscalYear: number;

  @IsString()
  @IsNotEmpty()
  period: string; // e.g., "Q1", "January", "Annual"

  @IsObject()
  @IsOptional()
  @Validate(AtLeastOneRequiredConstraint)
  data?: Record<string, any>; // Structured financial data

  @IsString()
  @IsOptional()
  storageKey?: string; // PDF/Excel file if uploaded
}
