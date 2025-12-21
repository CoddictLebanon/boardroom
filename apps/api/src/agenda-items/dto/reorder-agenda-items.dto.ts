import { IsArray, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderAgendaItemsDto {
  @ApiProperty({ description: 'Array of agenda item IDs in the new order', type: [String] })
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}
