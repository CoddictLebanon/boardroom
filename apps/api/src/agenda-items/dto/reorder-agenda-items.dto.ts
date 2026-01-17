import { IsArray, IsString } from 'class-validator';

export class ReorderAgendaItemsDto {
  @IsArray()
  @IsString({ each: true })
  itemIds!: string[];
}
