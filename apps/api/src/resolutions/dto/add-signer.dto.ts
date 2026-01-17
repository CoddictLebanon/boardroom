import { IsString, IsInt, IsOptional, IsBoolean, IsArray, ValidateNested, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class AddSignerDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsOptional()
  @IsInt()
  order?: number;
}

export class AddSignersDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddSignerDto)
  signers: AddSignerDto[];

  @IsOptional()
  @IsBoolean()
  includeStamp?: boolean;
}
