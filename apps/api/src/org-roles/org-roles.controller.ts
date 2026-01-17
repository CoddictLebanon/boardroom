import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { OrgRolesService } from './org-roles.service';
import { CreateOrgRoleDto, UpdateOrgRoleDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class OrgRolesController {
  constructor(private readonly orgRolesService: OrgRolesService) {}

  @Get('companies/:companyId/org-roles')
  @RequirePermission('team.view')
  findAll(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.orgRolesService.findAll(companyId, userId);
  }

  @Get('companies/:companyId/org-roles/:id')
  @RequirePermission('team.view')
  findOne(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.orgRolesService.findOne(id, userId);
  }

  @Post('companies/:companyId/org-roles')
  @RequirePermission('team.create')
  create(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateOrgRoleDto,
  ) {
    return this.orgRolesService.create(companyId, userId, dto);
  }

  @Put('companies/:companyId/org-roles/positions')
  @RequirePermission('team.edit')
  updatePositions(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() body: { positions: { id: string; x: number; y: number }[] },
  ) {
    return this.orgRolesService.updatePositions(companyId, userId, body.positions);
  }

  @Put('companies/:companyId/org-roles/:id')
  @RequirePermission('team.edit')
  update(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: UpdateOrgRoleDto,
  ) {
    return this.orgRolesService.update(id, userId, dto);
  }

  @Delete('companies/:companyId/org-roles/:id')
  @RequirePermission('team.delete')
  remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.orgRolesService.remove(id, userId);
  }
}
