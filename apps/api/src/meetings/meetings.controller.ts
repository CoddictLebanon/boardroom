import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Logger,
  UseGuards,
} from '@nestjs/common';
import { MeetingsService } from './meetings.service';
import {
  CreateMeetingDto,
  UpdateMeetingDto,
  CreateAgendaItemDto,
  UpdateAgendaItemDto,
  CreateDecisionDto,
  CastVoteDto,
  AddAttendeesDto,
  MarkAttendanceDto,
} from './dto';
import { MeetingStatus } from '@prisma/client';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class MeetingsController {
  private readonly logger = new Logger(MeetingsController.name);

  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('companies/:companyId/meetings')
  @RequirePermission('meetings.create')
  async createMeeting(
    @Param('companyId') companyId: string,
    @Body() createMeetingDto: CreateMeetingDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.createMeeting(companyId, userId, createMeetingDto);
  }

  @Get('companies/:companyId/meetings')
  @RequirePermission('meetings.view')
  async getMeetings(
    @Param('companyId') companyId: string,
    @Query('status') status?: MeetingStatus,
    @Query('upcoming') upcoming?: string,
    @Query('past') past?: string,
    @CurrentUser('userId') userId?: string,
  ): Promise<any> {
    const filters: any = {};
    if (status) filters.status = status;
    if (upcoming === 'true') filters.upcoming = true;
    if (past === 'true') filters.past = true;

    return this.meetingsService.getMeetings(companyId, userId!, filters);
  }

  @Get('companies/:companyId/meetings/:id')
  @RequirePermission('meetings.view')
  async getMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.getMeeting(id, userId);
  }

  @Put('companies/:companyId/meetings/:id')
  @RequirePermission('meetings.edit')
  async updateMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.updateMeeting(id, userId, updateMeetingDto);
  }

  @Delete('companies/:companyId/meetings/:id')
  @RequirePermission('meetings.delete')
  async cancelMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.cancelMeeting(id, userId);
  }

  @Post('companies/:companyId/meetings/:id/agenda')
  @RequirePermission('meetings.edit')
  async addAgendaItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() createAgendaItemDto: CreateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    this.logger.log(`POST /meetings/${id}/agenda - userId: ${userId}, title: ${createAgendaItemDto?.title}`);
    return this.meetingsService.addAgendaItem(id, userId, createAgendaItemDto);
  }

  @Put('companies/:companyId/meetings/:id/agenda/:itemId')
  @RequirePermission('meetings.edit')
  async updateAgendaItem(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateAgendaItemDto: UpdateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.updateAgendaItem(id, itemId, userId, updateAgendaItemDto);
  }

  @Post('companies/:companyId/meetings/:id/attendees')
  @RequirePermission('meetings.edit')
  async addAttendees(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() addAttendeesDto: AddAttendeesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.addAttendees(id, userId, addAttendeesDto);
  }

  @Put('companies/:companyId/meetings/:id/attendees/:attendeeId')
  @RequirePermission('meetings.edit')
  async markAttendance(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Body() markAttendanceDto: MarkAttendanceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.markAttendance(id, attendeeId, userId, markAttendanceDto);
  }

  @Post('companies/:companyId/meetings/:id/decisions')
  @RequirePermission('meetings.edit')
  async createDecision(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() createDecisionDto: CreateDecisionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.createDecision(id, userId, createDecisionDto);
  }

  @Post('companies/:companyId/meetings/:id/decisions/:decisionId/vote')
  @RequirePermission('meetings.edit')
  async castVote(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @Body() castVoteDto: CastVoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.castVote(id, decisionId, userId, castVoteDto);
  }

  @Post('companies/:companyId/meetings/:id/decisions/:decisionId/votes')
  @RequirePermission('meetings.edit')
  async castVoteAlternate(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @Body() castVoteDto: CastVoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.castVote(id, decisionId, userId, castVoteDto);
  }

  // Reorder must come before :decisionId routes to match correctly
  @Put('companies/:companyId/meetings/:id/decisions/reorder')
  @RequirePermission('meetings.edit')
  async reorderDecisions(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { decisionIds: string[] },
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.reorderDecisions(id, body.decisionIds, userId);
  }

  @Put('companies/:companyId/meetings/:id/decisions/:decisionId')
  @RequirePermission('meetings.edit')
  async updateDecision(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @Body() updateDecisionDto: { outcome?: 'PASSED' | 'REJECTED' | 'TABLED'; title?: string; description?: string },
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.updateDecision(id, decisionId, userId, updateDecisionDto);
  }

  @Delete('companies/:companyId/meetings/:id/decisions/:decisionId')
  @RequirePermission('meetings.edit')
  async deleteDecision(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.deleteDecision(id, decisionId, userId);
  }

  @Post('companies/:companyId/meetings/:id/start')
  @RequirePermission('meetings.start_live')
  async startMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.startMeeting(id, userId);
  }

  @Post('companies/:companyId/meetings/:id/pause')
  @RequirePermission('meetings.start_live')
  async pauseMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.pauseMeeting(id, userId);
  }

  @Post('companies/:companyId/meetings/:id/resume')
  @RequirePermission('meetings.start_live')
  async resumeMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.resumeMeeting(id, userId);
  }

  @Post('companies/:companyId/meetings/:id/end')
  @RequirePermission('meetings.start_live')
  async endMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.completeMeeting(id, userId);
  }

  @Post('companies/:companyId/meetings/:id/complete')
  @RequirePermission('meetings.start_live')
  async completeMeeting(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.completeMeeting(id, userId);
  }

  @Put('companies/:companyId/meetings/:id/notes')
  @RequirePermission('meetings.edit')
  async updateMeetingNotes(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() body: { notes: string },
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.updateMeetingNotes(id, userId, body.notes);
  }
}
