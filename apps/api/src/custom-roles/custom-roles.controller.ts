import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { CustomRolesService } from './custom-roles.service';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';

@Controller()
@UseGuards(ClerkAuthGuard)
export class CustomRolesController {
  constructor(private readonly customRolesService: CustomRolesService) {}

  @Get('companies/:companyId/custom-roles')
  async findAll(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    await this.customRolesService.verifyOwner(userId, companyId);
    return this.customRolesService.getCompanyCustomRoles(companyId);
  }

  @Post('companies/:companyId/custom-roles')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateCustomRoleDto,
    @CurrentUser('userId') userId: string,
  ) {
    await this.customRolesService.verifyOwner(userId, companyId);
    return this.customRolesService.createCustomRole(companyId, dto);
  }

  @Put('custom-roles/:id')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateCustomRoleDto,
    @CurrentUser('userId') userId: string,
  ) {
    const companyId = await this.customRolesService.getCompanyIdForRole(id);
    await this.customRolesService.verifyOwner(userId, companyId);
    return this.customRolesService.updateCustomRole(id, dto);
  }

  @Delete('custom-roles/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    const companyId = await this.customRolesService.getCompanyIdForRole(id);
    await this.customRolesService.verifyOwner(userId, companyId);
    await this.customRolesService.deleteCustomRole(id);
  }
}
