import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Put,
  Delete,
  Query,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';
import { CreateResolutionDto, UpdateResolutionDto } from './dto';
import { ResolutionStatus, ResolutionCategory } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';

@Controller()
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  @Post('companies/:companyId/resolutions')
  create(
    @Param('companyId') companyId: string,
    @Body() createResolutionDto: CreateResolutionDto,
  ) {
    return this.resolutionsService.create(companyId, createResolutionDto);
  }

  @Get('companies/:companyId/resolutions')
  findAll(
    @Param('companyId') companyId: string,
    @Query('status') status?: ResolutionStatus,
    @Query('category') category?: ResolutionCategory,
    @Query('year') year?: string,
  ) {
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (category) {
      filters.category = category;
    }

    if (year) {
      const yearNum = parseInt(year, 10);
      if (!isNaN(yearNum)) {
        filters.year = yearNum;
      }
    }

    return this.resolutionsService.findAll(companyId, filters);
  }

  @Get('companies/:companyId/resolutions/next-number')
  getNextNumber(@Param('companyId') companyId: string) {
    return this.resolutionsService.getNextResolutionNumber(companyId);
  }

  @Get('resolutions/:id')
  findOne(@Param('id') id: string) {
    return this.resolutionsService.findOne(id);
  }

  @Put('resolutions/:id')
  update(
    @Param('id') id: string,
    @Body() updateResolutionDto: UpdateResolutionDto,
  ) {
    return this.resolutionsService.update(id, updateResolutionDto);
  }

  @Put('resolutions/:id/status')
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: ResolutionStatus,
  ) {
    return this.resolutionsService.updateStatus(id, status);
  }

  @Delete('resolutions/:id')
  remove(@Param('id') id: string) {
    return this.resolutionsService.remove(id);
  }
}
