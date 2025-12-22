import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
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

@Controller()
export class MeetingsController {
  constructor(private readonly meetingsService: MeetingsService) {}

  @Post('companies/:companyId/meetings')
  async createMeeting(
    @Param('companyId') companyId: string,
    @Body() createMeetingDto: CreateMeetingDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.createMeeting(companyId, userId, createMeetingDto);
  }

  @Get('companies/:companyId/meetings')
  async getMeetings(
    @Param('companyId') companyId: string,
    @Query('status') status?: MeetingStatus,
    @Query('upcoming') upcoming?: string,
    @Query('past') past?: string,
    @Request() req?: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';

    const filters: any = {};
    if (status) filters.status = status;
    if (upcoming === 'true') filters.upcoming = true;
    if (past === 'true') filters.past = true;

    return this.meetingsService.getMeetings(companyId, userId, filters);
  }

  @Get('meetings/:id')
  async getMeeting(@Param('id') id: string, @Request() req: any) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.getMeeting(id, userId);
  }

  @Put('meetings/:id')
  async updateMeeting(
    @Param('id') id: string,
    @Body() updateMeetingDto: UpdateMeetingDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.updateMeeting(id, userId, updateMeetingDto);
  }

  @Delete('meetings/:id')
  async cancelMeeting(@Param('id') id: string, @Request() req: any) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.cancelMeeting(id, userId);
  }

  @Post('meetings/:id/agenda')
  async addAgendaItem(
    @Param('id') id: string,
    @Body() createAgendaItemDto: CreateAgendaItemDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.addAgendaItem(id, userId, createAgendaItemDto);
  }

  @Put('meetings/:id/agenda/:itemId')
  async updateAgendaItem(
    @Param('id') id: string,
    @Param('itemId') itemId: string,
    @Body() updateAgendaItemDto: UpdateAgendaItemDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.updateAgendaItem(id, itemId, userId, updateAgendaItemDto);
  }

  @Post('meetings/:id/attendees')
  async addAttendees(
    @Param('id') id: string,
    @Body() addAttendeesDto: AddAttendeesDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.addAttendees(id, userId, addAttendeesDto);
  }

  @Put('meetings/:id/attendees/:attendeeId')
  async markAttendance(
    @Param('id') id: string,
    @Param('attendeeId') attendeeId: string,
    @Body() markAttendanceDto: MarkAttendanceDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.markAttendance(id, attendeeId, userId, markAttendanceDto);
  }

  @Post('meetings/:id/decisions')
  async createDecision(
    @Param('id') id: string,
    @Body() createDecisionDto: CreateDecisionDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.createDecision(id, userId, createDecisionDto);
  }

  @Post('meetings/:id/decisions/:decisionId/vote')
  async castVote(
    @Param('id') id: string,
    @Param('decisionId') decisionId: string,
    @Body() castVoteDto: CastVoteDto,
    @Request() req: any,
  ) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.castVote(id, decisionId, userId, castVoteDto);
  }

  @Post('meetings/:id/complete')
  async completeMeeting(@Param('id') id: string, @Request() req: any) {
    // TODO: Get userId from authenticated user (Clerk)
    const userId = req.user?.id || 'temp-user-id';
    return this.meetingsService.completeMeeting(id, userId);
  }
}
