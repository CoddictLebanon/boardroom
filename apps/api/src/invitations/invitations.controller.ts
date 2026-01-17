import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('companies/:companyId/invitations')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.invite')
  @HttpCode(HttpStatus.CREATED)
  createInvitation(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() dto: CreateInvitationDto,
  ) {
    return this.invitationsService.createInvitation(companyId, userId, dto);
  }

  @Get('companies/:companyId/invitations')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.view')
  listInvitations(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.listInvitations(companyId, userId);
  }

  @Delete('companies/:companyId/invitations/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.invite')
  revokeInvitation(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.revokeInvitation(id, companyId, userId);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
  ) {
    // No permission check needed - having a valid token is the authorization
    return this.invitationsService.acceptInvitationByToken(token, userId);
  }
}
