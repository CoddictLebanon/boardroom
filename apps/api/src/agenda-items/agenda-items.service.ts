import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsGateway } from '../gateway/meetings.gateway';
import { CreateAgendaItemDto, UpdateAgendaItemDto } from './dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
};

@Injectable()
export class AgendaItemsService {
  private readonly logger = new Logger(AgendaItemsService.name);

  constructor(
    private prisma: PrismaService,
    private meetingsGateway: MeetingsGateway,
  ) {}

  async create(
    companyId: string,
    meetingId: string,
    dto: CreateAgendaItemDto,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const maxOrderItem = await this.prisma.agendaItem.findFirst({
      where: { meetingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderItem?.order ?? -1) + 1;

    const item = await this.prisma.agendaItem.create({
      data: {
        meetingId,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        createdById: userId,
        order: nextOrder,
      },
      include: {
        createdBy: { select: userSelect },
      },
    });

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:created', item);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:created event: ${errorMessage}`);
    }

    return item;
  }

  async findAllForMeeting(
    companyId: string,
    meetingId: string,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    return this.prisma.agendaItem.findMany({
      where: { meetingId },
      include: {
        createdBy: { select: userSelect },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(
    companyId: string,
    meetingId: string,
    itemId: string,
    dto: UpdateAgendaItemDto,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const existing = await this.prisma.agendaItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.meetingId !== meetingId) {
      throw new NotFoundException('Agenda item not found');
    }

    const item = await this.prisma.agendaItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
      },
      include: {
        createdBy: { select: userSelect },
      },
    });

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:updated', item);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:updated event: ${errorMessage}`);
    }

    return item;
  }

  async remove(
    companyId: string,
    meetingId: string,
    itemId: string,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const existing = await this.prisma.agendaItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.meetingId !== meetingId) {
      throw new NotFoundException('Agenda item not found');
    }

    await this.prisma.agendaItem.delete({
      where: { id: itemId },
    });

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:deleted', { id: itemId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:deleted event: ${errorMessage}`);
    }

    return { message: 'Agenda item deleted successfully' };
  }

  async reorder(
    companyId: string,
    meetingId: string,
    itemIds: string[],
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const updates = itemIds.map((itemId, index) =>
      this.prisma.agendaItem.update({
        where: { id: itemId },
        data: { order: index },
        include: {
          createdBy: { select: userSelect },
        },
      }),
    );

    const items = await this.prisma.$transaction(updates);

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:reordered', { itemIds });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:reordered event: ${errorMessage}`);
    }

    return items;
  }

  private async verifyMeetingAccess(
    userId: string,
    companyId: string,
    meetingId: string,
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.companyId !== companyId) {
      throw new NotFoundException('Meeting not found');
    }

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
