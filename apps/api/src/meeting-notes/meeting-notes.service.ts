import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsGateway } from '../gateway/meetings.gateway';
import { CreateMeetingNoteDto, UpdateMeetingNoteDto } from './dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
};

@Injectable()
export class MeetingNotesService {
  private readonly logger = new Logger(MeetingNotesService.name);

  constructor(
    private prisma: PrismaService,
    private meetingsGateway: MeetingsGateway,
  ) {}

  async create(
    companyId: string,
    meetingId: string,
    dto: CreateMeetingNoteDto,
    userId: string,
  ) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    // Get the max order for existing notes
    const maxOrderNote = await this.prisma.meetingNote.findFirst({
      where: { meetingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderNote?.order ?? -1) + 1;

    const note = await this.prisma.meetingNote.create({
      data: {
        meetingId,
        content: dto.content,
        createdById: userId,
        order: nextOrder,
      },
      include: {
        createdBy: { select: userSelect },
      },
    });

    // Emit real-time event
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'note:created', note);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit note:created event: ${errorMessage}`);
    }

    return note;
  }

  async findAllForMeeting(
    companyId: string,
    meetingId: string,
    userId: string,
  ) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    return this.prisma.meetingNote.findMany({
      where: { meetingId },
      include: {
        createdBy: { select: userSelect },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async findOne(
    companyId: string,
    meetingId: string,
    noteId: string,
    userId: string,
  ) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const note = await this.prisma.meetingNote.findUnique({
      where: { id: noteId },
      include: {
        createdBy: { select: userSelect },
      },
    });

    if (!note || note.meetingId !== meetingId) {
      throw new NotFoundException('Meeting note not found');
    }

    return note;
  }

  async update(
    companyId: string,
    meetingId: string,
    noteId: string,
    dto: UpdateMeetingNoteDto,
    userId: string,
  ) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const existingNote = await this.prisma.meetingNote.findUnique({
      where: { id: noteId },
    });

    if (!existingNote || existingNote.meetingId !== meetingId) {
      throw new NotFoundException('Meeting note not found');
    }

    // Only the creator can edit their note
    if (existingNote.createdById !== userId) {
      throw new ForbiddenException('You can only edit your own notes');
    }

    const note = await this.prisma.meetingNote.update({
      where: { id: noteId },
      data: { content: dto.content },
      include: {
        createdBy: { select: userSelect },
      },
    });

    // Emit real-time event
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'note:updated', note);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit note:updated event: ${errorMessage}`);
    }

    return note;
  }

  async remove(
    companyId: string,
    meetingId: string,
    noteId: string,
    userId: string,
  ) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const existingNote = await this.prisma.meetingNote.findUnique({
      where: { id: noteId },
    });

    if (!existingNote || existingNote.meetingId !== meetingId) {
      throw new NotFoundException('Meeting note not found');
    }

    // Only the creator can delete their note
    if (existingNote.createdById !== userId) {
      throw new ForbiddenException('You can only delete your own notes');
    }

    await this.prisma.meetingNote.delete({
      where: { id: noteId },
    });

    // Emit real-time event
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'note:deleted', { id: noteId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit note:deleted event: ${errorMessage}`);
    }

    return { message: 'Meeting note deleted successfully' };
  }

  async reorder(
    companyId: string,
    meetingId: string,
    noteIds: string[],
    userId: string,
  ) {
    // Verify meeting exists and user has access
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    // Update each note's order
    const updates = noteIds.map((noteId, index) =>
      this.prisma.meetingNote.update({
        where: { id: noteId },
        data: { order: index },
        include: {
          createdBy: { select: userSelect },
        },
      }),
    );

    const notes = await this.prisma.$transaction(updates);

    // Emit real-time event with reordered notes
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'notes:reordered', { noteIds });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit notes:reordered event: ${errorMessage}`);
    }

    return notes;
  }

  private async verifyMeetingAccess(
    userId: string,
    companyId: string,
    meetingId: string,
  ) {
    // Verify meeting exists and belongs to company
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.companyId !== companyId) {
      throw new NotFoundException('Meeting not found');
    }

    // Verify user is an active member of the company
    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return { meeting, membership };
  }
}
