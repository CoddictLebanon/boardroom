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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@ApiTags('invitations')
@ApiBearerAuth()
@Controller()
@UseGuards(ClerkAuthGuard)
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('companies/:companyId/invitations')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.invite')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create an invitation' })
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
  @ApiOperation({ summary: 'List invitations for a company' })
  listInvitations(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.listInvitations(companyId, userId);
  }

  @Delete('companies/:companyId/invitations/:id')
  @UseGuards(PermissionGuard)
  @RequirePermission('members.invite')
  @ApiOperation({ summary: 'Revoke an invitation' })
  revokeInvitation(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.revokeInvitation(id, companyId, userId);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation by token' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
  ) {
    // No permission check needed - having a valid token is the authorization
    return this.invitationsService.acceptInvitationByToken(token, userId);
  }
}
