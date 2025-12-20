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
  UseGuards,
} from '@nestjs/common';
import { ResolutionsService } from './resolutions.service';
import { CreateResolutionDto, UpdateResolutionDto } from './dto';
import { ResolutionStatus, ResolutionCategory } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class ResolutionsController {
  constructor(private readonly resolutionsService: ResolutionsService) {}

  @Post('companies/:companyId/resolutions')
  @RequirePermission('resolutions.create')
  create(
    @Param('companyId') companyId: string,
    @Body() createResolutionDto: CreateResolutionDto,
  ) {
    return this.resolutionsService.create(companyId, createResolutionDto);
  }

  @Get('companies/:companyId/resolutions')
  @RequirePermission('resolutions.view')
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
  @RequirePermission('resolutions.view')
  getNextNumber(@Param('companyId') companyId: string) {
    return this.resolutionsService.getNextResolutionNumber(companyId);
  }

  @Get('companies/:companyId/resolutions/:id')
  @RequirePermission('resolutions.view')
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.resolutionsService.findOne(id);
  }

  @Put('companies/:companyId/resolutions/:id')
  @RequirePermission('resolutions.edit')
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() updateResolutionDto: UpdateResolutionDto,
  ) {
    return this.resolutionsService.update(id, updateResolutionDto);
  }

  @Put('companies/:companyId/resolutions/:id/status')
  @RequirePermission('resolutions.change_status')
  updateStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body('status') status: ResolutionStatus,
  ) {
    return this.resolutionsService.updateStatus(id, status);
  }

  @Delete('companies/:companyId/resolutions/:id')
  @RequirePermission('resolutions.delete')
  remove(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.resolutionsService.remove(id);
  }
}
