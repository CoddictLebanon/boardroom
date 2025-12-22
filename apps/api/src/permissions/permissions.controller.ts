import {
  Controller,
  Get,
  Put,
  Body,
  Param,
  UseGuards,
  ValidationPipe,
  UsePipes,
} from '@nestjs/common';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { CurrentUser } from '../auth/decorators';
import { PermissionsService } from './permissions.service';
import { UpdateRolePermissionsDto } from './dto';

@Controller()
@UseGuards(ClerkAuthGuard)
export class PermissionsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  /**
   * Get all permissions for a company (for management UI)
   * GET /companies/:companyId/permissions
   * OWNER only
   */
  @Get('companies/:companyId/permissions')
  async getCompanyPermissions(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    // Verify user is OWNER before allowing access to permission management
    await this.permissionsService.verifyOwner(userId, companyId);
    return this.permissionsService.getCompanyPermissions(companyId);
  }

  /**
   * Update permissions for a role (system or custom)
   * PUT /companies/:companyId/permissions
   * OWNER only
   */
  @Put('companies/:companyId/permissions')
  @UsePipes(new ValidationPipe({ whitelist: true }))
  async updatePermissions(
    @Param('companyId') companyId: string,
    @Body() dto: UpdateRolePermissionsDto,
    @CurrentUser('userId') userId: string,
  ) {
    // Verify user is OWNER before allowing permission changes
    await this.permissionsService.verifyOwner(userId, companyId);

    await this.permissionsService.updateRolePermissions(
      companyId,
      dto.role || null,
      dto.customRoleId || null,
      dto.permissions,
    );

    return { success: true };
  }

  /**
   * Get current user's permissions (for frontend to check what user can do)
   * GET /companies/:companyId/my-permissions
   * Any authenticated user
   */
  @Get('companies/:companyId/my-permissions')
  async getMyPermissions(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    const permissions = await this.permissionsService.getUserPermissions(
      userId,
      companyId,
    );
    return { permissions };
  }
}
