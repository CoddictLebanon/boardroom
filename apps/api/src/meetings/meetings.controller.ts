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

@Controller()
export class MeetingsController {
  private readonly logger = new Logger(MeetingsController.name);

  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('companies/:companyId/meetings')
  async createMeeting(
    @Param('companyId') companyId: string,
    @Body() createMeetingDto: CreateMeetingDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.createMeeting(companyId, userId, createMeetingDto);
  }

  @Get('companies/:companyId/meetings')
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

  @Get('meetings/:id')
  async getMeeting(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.getMeeting(id, userId);
  }

  @Put('meetings/:id')
  async updateMeeting(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.updateMeeting(id, userId, updateMeetingDto);
  }

  @Delete('meetings/:id')
  async cancelMeeting(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.cancelMeeting(id, userId);
  }

  @Post('meetings/:id/agenda')
  async addAgendaItem(
    @Param('id') id: string,
    @Body() createAgendaItemDto: CreateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    this.logger.log(`POST /meetings/${id}/agenda - userId: ${userId}, title: ${createAgendaItemDto?.title}`);
    return this.meetingsService.addAgendaItem(id, userId, createAgendaItemDto);
  }

  @Put('meetings/:id/agenda/:itemId')
  async updateAgendaItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateAgendaItemDto: UpdateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.updateAgendaItem(id, itemId, userId, updateAgendaItemDto);
  }

  @Post('meetings/:id/attendees')
  async addAttendees(
    @Param('id') id: string,
    @Body() addAttendeesDto: AddAttendeesDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.addAttendees(id, userId, addAttendeesDto);
  }

  @Put('meetings/:id/attendees/:attendeeId')
  async markAttendance(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Body() markAttendanceDto: MarkAttendanceDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.markAttendance(id, attendeeId, userId, markAttendanceDto);
  }

  @Post('meetings/:id/decisions')
  async createDecision(
    @Param('id') id: string,
    @Body() createDecisionDto: CreateDecisionDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.createDecision(id, userId, createDecisionDto);
  }

  @Post('meetings/:id/decisions/:decisionId/vote')
  async castVote(
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @Body() castVoteDto: CastVoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.castVote(id, decisionId, userId, castVoteDto);
  }

  @Post('meetings/:id/complete')
  async completeMeeting(
    @Param('id') id: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingsService.completeMeeting(id, userId);
  }
}
