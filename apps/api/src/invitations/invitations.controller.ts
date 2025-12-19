import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvitationsService } from './invitations.service';
import { CreateInvitationDto } from './dto';
import { CurrentUser } from '../auth/decorators';

@ApiTags('invitations')
@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  @Post('companies/:companyId/invitations')
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
  @ApiOperation({ summary: 'List invitations for a company' })
  listInvitations(
    @Param('companyId') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.listInvitations(companyId, userId);
  }

  @Delete('invitations/:id')
  @ApiOperation({ summary: 'Revoke an invitation' })
  revokeInvitation(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.revokeInvitation(id, userId);
  }

  @Post('invitations/:token/accept')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Accept an invitation by token' })
  acceptInvitation(
    @Param('token') token: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.invitationsService.acceptInvitationByToken(token, userId);
  }
}
