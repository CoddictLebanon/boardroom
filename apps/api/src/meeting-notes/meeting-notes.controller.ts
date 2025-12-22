import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { MeetingNotesService } from './meeting-notes.service';
import { CreateMeetingNoteDto, UpdateMeetingNoteDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller('companies/:companyId/meetings/:meetingId/notes')
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class MeetingNotesController {
  constructor(private readonly meetingNotesService: MeetingNotesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('meetings.edit')
  create(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateMeetingNoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.create(companyId, meetingId, dto, userId);
  }

  @Get()
  @RequirePermission('meetings.view')
  findAll(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.findAllForMeeting(companyId, meetingId, userId);
  }

  // Reorder must come before :noteId routes to match correctly
  @Put('reorder')
  @RequirePermission('meetings.edit')
  reorder(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: { noteIds: string[] },
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.reorder(companyId, meetingId, body.noteIds, userId);
  }

  @Get(':noteId')
  @RequirePermission('meetings.view')
  findOne(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.findOne(companyId, meetingId, noteId, userId);
  }

  @Put(':noteId')
  @RequirePermission('meetings.edit')
  update(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateMeetingNoteDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.update(companyId, meetingId, noteId, dto, userId);
  }

  @Delete(':noteId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('meetings.edit')
  remove(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('noteId') noteId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.meetingNotesService.remove(companyId, meetingId, noteId, userId);
  }
}
