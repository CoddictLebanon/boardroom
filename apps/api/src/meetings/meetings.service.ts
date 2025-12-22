import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EmailService } from '../email/email.service';
import { MeetingsGateway } from '../gateway/meetings.gateway';
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
import { MeetingStatus, DecisionOutcome } from '@prisma/client';

@Injectable()
export class MeetingsService {
  private readonly logger = new Logger(MeetingsService.name);

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
    private meetingsGateway: MeetingsGateway,
  ) {
    this.logger.log(`MeetingsService initialized, gateway injected: ${!!this.meetingsGateway}`);
  }

  async createMeeting(companyId: string, userId: string, dto: CreateMeetingDto) {
    // Verify user is a member of the company
    await this.verifyCompanyMember(companyId, userId);

    const meeting = await this.prisma.meeting.create({
      data: {
        companyId,
        title: dto.title,
        description: dto.description,
        scheduledAt: new Date(dto.scheduledAt),
        duration: dto.duration,
        location: dto.location,
        videoLink: dto.videoLink,
        status: MeetingStatus.SCHEDULED,
        ...(dto.attendeeIds && {
          attendees: {
            create: dto.attendeeIds.map((memberId) => ({
              memberId,
            })),
          },
        }),
        ...(dto.agendaItems && {
          agendaItems: {
            create: dto.agendaItems.map((item, index) => ({
              title: item.title,
              description: item.description,
              duration: item.duration,
              order: index + 1,
            })),
          },
        }),
      },
      include: {
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return meeting;
  }

  async getMeetings(
    companyId: string,
    userId: string,
    filters?: { status?: MeetingStatus; upcoming?: boolean; past?: boolean },
  ) {
    // Verify user is a member of the company
    await this.verifyCompanyMember(companyId, userId);

    const where: any = {
      companyId,
    };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.upcoming) {
      where.scheduledAt = {
        gte: new Date(),
      };
      where.status = {
        in: [MeetingStatus.SCHEDULED, MeetingStatus.IN_PROGRESS],
      };
    }

    if (filters?.past) {
      where.OR = [
        { scheduledAt: { lt: new Date() } },
        { status: MeetingStatus.COMPLETED },
      ];
    }

    const meetings = await this.prisma.meeting.findMany({
      where,
      include: {
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
        _count: {
          select: {
            decisions: true,
          },
        },
      },
      orderBy: {
        scheduledAt: 'desc',
      },
    });

    return meetings;
  }

  async getMeeting(id: string, userId: string) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id },
      include: {
        company: true,
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
            decisions: {
              include: {
                votes: {
                  include: {
                    user: true,
                  },
                },
              },
            },
            actions: {
              include: {
                assignee: true,
              },
            },
          },
        },
        decisions: {
          include: {
            votes: {
              include: {
                user: true,
              },
            },
            agendaItem: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                imageUrl: true,
              },
            },
          },
        },
        documents: {
          include: {
            document: {
              include: {
                uploader: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true,
                  },
                },
              },
            },
          },
        },
        actionItems: {
          include: {
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                imageUrl: true,
              },
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            },
          },
          orderBy: {
            createdAt: 'desc',
          },
        },
        summary: true,
      },
    });

    if (!meeting) {
      throw new NotFoundException('Meeting not found');
    }

    // Verify user is a member of the company
    await this.verifyCompanyMember(meeting.companyId, userId);

    return meeting;
  }

  async updateMeeting(id: string, userId: string, dto: UpdateMeetingDto) {
    const meeting = await this.getMeeting(id, userId);

    // Check if meeting can be updated
    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot update a completed meeting');
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt ? new Date(dto.scheduledAt) : undefined,
        duration: dto.duration,
        location: dto.location,
        videoLink: dto.videoLink,
        status: dto.status,
      },
      include: {
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updated;
  }

  async cancelMeeting(id: string, userId: string) {
    const meeting = await this.getMeeting(id, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot cancel a completed meeting');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException('Meeting is already cancelled');
    }

    const updated = await this.prisma.meeting.update({
      where: { id },
      data: {
        status: MeetingStatus.CANCELLED,
      },
    });

    return updated;
  }

  async addAgendaItem(meetingId: string, userId: string, dto: CreateAgendaItemDto) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot add agenda items to a completed meeting');
    }

    // Get the highest order number
    const maxOrder = await this.prisma.agendaItem.findFirst({
      where: { meetingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });

    const agendaItem = await this.prisma.agendaItem.create({
      data: {
        meetingId,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        order: (maxOrder?.order || 0) + 1,
        createdById: userId,
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });

    return agendaItem;
  }

  async updateAgendaItem(
    meetingId: string,
    itemId: string,
    userId: string,
    dto: UpdateAgendaItemDto,
  ) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot update agenda items of a completed meeting');
    }

    // Verify agenda item belongs to meeting
    const agendaItem = await this.prisma.agendaItem.findFirst({
      where: {
        id: itemId,
        meetingId,
      },
    });

    if (!agendaItem) {
      throw new NotFoundException('Agenda item not found');
    }

    const updated = await this.prisma.agendaItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        notes: dto.notes,
      },
    });

    return updated;
  }

  async addAttendees(meetingId: string, userId: string, dto: AddAttendeesDto) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot add attendees to a completed meeting');
    }

    // Verify all members belong to the company
    const members = await this.prisma.companyMember.findMany({
      where: {
        id: { in: dto.memberIds },
        companyId: meeting.companyId,
      },
    });

    if (members.length !== dto.memberIds.length) {
      throw new BadRequestException('One or more members not found in company');
    }

    // Auto-mark as present if meeting is in progress or paused
    const isPresent = meeting.status === MeetingStatus.IN_PROGRESS || meeting.status === MeetingStatus.PAUSED;

    // Create attendees (skip duplicates)
    const attendees = await Promise.all(
      dto.memberIds.map(async (memberId) => {
        return this.prisma.meetingAttendee.upsert({
          where: {
            meetingId_memberId: {
              meetingId,
              memberId,
            },
          },
          create: {
            meetingId,
            memberId,
            isPresent,
          },
          update: {},
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        });
      }),
    );

    return attendees;
  }

  async markAttendance(
    meetingId: string,
    attendeeId: string,
    userId: string,
    dto: MarkAttendanceDto,
  ) {
    const meeting = await this.getMeeting(meetingId, userId);

    // Verify attendee exists
    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: {
        id: attendeeId,
        meetingId,
      },
    });

    if (!attendee) {
      throw new NotFoundException('Attendee not found');
    }

    const updated = await this.prisma.meetingAttendee.update({
      where: { id: attendeeId },
      data: {
        isPresent: dto.isPresent,
      },
      include: {
        member: {
          include: {
            user: true,
          },
        },
      },
    });

    return updated;
  }

  async createDecision(meetingId: string, userId: string, dto: CreateDecisionDto) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot create decisions for a completed meeting');
    }

    // Verify agenda item if provided
    if (dto.agendaItemId) {
      const agendaItem = await this.prisma.agendaItem.findFirst({
        where: {
          id: dto.agendaItemId,
          meetingId,
        },
      });

      if (!agendaItem) {
        throw new NotFoundException('Agenda item not found');
      }
    }

    // Get max order for this meeting's decisions
    const maxOrderItem = await this.prisma.decision.findFirst({
      where: { meetingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderItem?.order ?? -1) + 1;

    const decision = await this.prisma.decision.create({
      data: {
        meetingId,
        agendaItemId: dto.agendaItemId,
        createdById: userId,
        title: dto.title,
        description: dto.description,
        order: nextOrder,
      },
      include: {
        votes: {
          include: {
            user: true,
          },
        },
        agendaItem: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });

    // Emit socket event
    try {
      this.logger.log(`Emitting decision:created to meeting ${meetingId}`);
      this.meetingsGateway.emitToMeeting(meetingId, 'decision:created', decision);
      this.logger.log(`Successfully emitted decision:created event`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit decision:created event: ${errorMessage}`);
    }

    return decision;
  }

  async castVote(
    meetingId: string,
    decisionId: string,
    userId: string,
    dto: CastVoteDto,
  ) {
    const meeting = await this.getMeeting(meetingId, userId);

    // Only allow voting during IN_PROGRESS meetings
    if (meeting.status !== MeetingStatus.IN_PROGRESS) {
      throw new BadRequestException('Voting is only allowed during in-progress meetings');
    }

    // Verify decision belongs to meeting
    const decision = await this.prisma.decision.findFirst({
      where: {
        id: decisionId,
        meetingId,
      },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    // Verify user is an attendee
    const isAttendee = meeting.attendees.some(
      (attendee) => attendee.member.userId === userId,
    );

    if (!isAttendee) {
      throw new ForbiddenException('Only meeting attendees can vote');
    }

    // Create or update vote
    const vote = await this.prisma.vote.upsert({
      where: {
        decisionId_userId: {
          decisionId,
          userId,
        },
      },
      create: {
        decisionId,
        userId,
        vote: dto.vote,
      },
      update: {
        vote: dto.vote,
      },
      include: {
        user: true,
      },
    });

    // Get updated vote tally
    const allVotes = await this.prisma.vote.findMany({
      where: { decisionId },
    });
    const tally = {
      for: allVotes.filter((v) => v.vote === 'FOR').length,
      against: allVotes.filter((v) => v.vote === 'AGAINST').length,
      abstain: allVotes.filter((v) => v.vote === 'ABSTAIN').length,
    };

    // Emit socket event for real-time vote updates
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'vote:updated', {
        decisionId,
        voterId: userId,
        vote: dto.vote,
        tally,
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit vote:updated event: ${errorMessage}`);
    }

    return vote;
  }

  async startMeeting(meetingId: string, userId: string) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot start a completed meeting');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException('Cannot start a cancelled meeting');
    }

    if (meeting.status === MeetingStatus.IN_PROGRESS) {
      throw new BadRequestException('Meeting is already in progress');
    }

    // Auto-mark all attendees as present when meeting starts
    await this.prisma.meetingAttendee.updateMany({
      where: { meetingId },
      data: { isPresent: true },
    });

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.IN_PROGRESS,
        startedAt: new Date(),
      },
      include: {
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updated;
  }

  async pauseMeeting(meetingId: string, userId: string) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status !== MeetingStatus.IN_PROGRESS) {
      throw new BadRequestException('Only in-progress meetings can be paused');
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.PAUSED,
      },
      include: {
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updated;
  }

  async resumeMeeting(meetingId: string, userId: string) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status !== MeetingStatus.PAUSED) {
      throw new BadRequestException('Only paused meetings can be resumed');
    }

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.IN_PROGRESS,
      },
      include: {
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });

    return updated;
  }

  async updateMeetingNotes(meetingId: string, userId: string, notes: string) {
    const meeting = await this.getMeeting(meetingId, userId);

    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        notes,
      },
    });

    return updated;
  }

  async updateDecision(
    meetingId: string,
    decisionId: string,
    userId: string,
    dto: { outcome?: 'PASSED' | 'REJECTED' | 'TABLED'; title?: string; description?: string },
  ) {
    const meeting = await this.getMeeting(meetingId, userId);

    // Verify decision belongs to meeting
    const decision = await this.prisma.decision.findFirst({
      where: {
        id: decisionId,
        meetingId,
      },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    const updated = await this.prisma.decision.update({
      where: { id: decisionId },
      data: {
        ...(dto.outcome && { outcome: dto.outcome as DecisionOutcome }),
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
      },
      include: {
        votes: {
          include: {
            user: true,
          },
        },
        agendaItem: true,
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            imageUrl: true,
          },
        },
      },
    });

    // Emit socket event
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'decision:updated', updated);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit decision:updated event: ${errorMessage}`);
    }

    return updated;
  }

  async deleteDecision(meetingId: string, decisionId: string, userId: string) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Cannot delete decisions from a completed meeting');
    }

    // Verify decision belongs to meeting
    const decision = await this.prisma.decision.findFirst({
      where: {
        id: decisionId,
        meetingId,
      },
    });

    if (!decision) {
      throw new NotFoundException('Decision not found');
    }

    await this.prisma.decision.delete({
      where: { id: decisionId },
    });

    // Emit socket event
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'decision:deleted', { id: decisionId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit decision:deleted event: ${errorMessage}`);
    }

    return { message: 'Decision deleted successfully' };
  }

  async reorderDecisions(meetingId: string, decisionIds: string[], userId: string) {
    await this.getMeeting(meetingId, userId);

    const updates = decisionIds.map((decisionId, index) =>
      this.prisma.decision.update({
        where: { id: decisionId },
        data: { order: index },
        include: {
          votes: {
            include: {
              user: true,
            },
          },
          agendaItem: true,
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              imageUrl: true,
            },
          },
        },
      }),
    );

    const decisions = await this.prisma.$transaction(updates);

    // Emit socket event
    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'decision:reordered', { decisionIds });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit decision:reordered event: ${errorMessage}`);
    }

    return decisions;
  }

  async completeMeeting(meetingId: string, userId: string) {
    const meeting = await this.getMeeting(meetingId, userId);

    if (meeting.status === MeetingStatus.COMPLETED) {
      throw new BadRequestException('Meeting is already completed');
    }

    if (meeting.status === MeetingStatus.CANCELLED) {
      throw new BadRequestException('Cannot complete a cancelled meeting');
    }

    // Calculate decision outcomes based on votes
    const decisionsWithVotes = await this.prisma.decision.findMany({
      where: { meetingId },
      include: {
        votes: true,
      },
    });

    // Update each decision's outcome
    await Promise.all(
      decisionsWithVotes.map(async (decision) => {
        const forVotes = decision.votes.filter((v) => v.vote === 'FOR').length;
        const againstVotes = decision.votes.filter((v) => v.vote === 'AGAINST').length;

        let outcome: DecisionOutcome;
        if (forVotes > againstVotes) {
          outcome = DecisionOutcome.PASSED;
        } else if (againstVotes > forVotes) {
          outcome = DecisionOutcome.REJECTED;
        } else {
          outcome = DecisionOutcome.TABLED;
        }

        return this.prisma.decision.update({
          where: { id: decision.id },
          data: { outcome },
        });
      }),
    );

    // Generate meeting summary
    const summary = await this.generateMeetingSummary(meeting);

    // Update meeting status
    const updated = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: {
        status: MeetingStatus.COMPLETED,
        endedAt: new Date(),
        summary: {
          create: {
            content: summary,
          },
        },
      },
      include: {
        company: true,
        attendees: {
          include: {
            member: {
              include: {
                user: true,
              },
            },
          },
        },
        agendaItems: {
          orderBy: {
            order: 'asc',
          },
        },
        decisions: {
          include: {
            votes: {
              include: {
                user: true,
              },
            },
          },
        },
        summary: true,
      },
    });

    // Send email summary to all attendees
    await this.sendMeetingSummaryEmails(updated, summary);

    return updated;
  }

  private async sendMeetingSummaryEmails(meeting: any, summaryJson: string) {
    const summary = JSON.parse(summaryJson);

    // Get all attendee emails
    const attendeeEmails = meeting.attendees
      .filter((a: any) => a.member?.user?.email)
      .map((a: any) => a.member.user.email);

    if (attendeeEmails.length === 0) return;

    // Send email to each attendee
    for (const email of attendeeEmails) {
      try {
        await this.emailService.sendMeetingSummaryEmail({
          to: email,
          meetingTitle: meeting.title,
          companyName: meeting.company.name,
          scheduledAt: meeting.scheduledAt,
          attendees: summary.attendees,
          agendaItems: summary.agendaItems,
          decisions: summary.decisions,
          notes: meeting.notes,
        });
      } catch (error) {
        console.error(`Failed to send summary email to ${email}:`, error);
      }
    }
  }

  private async generateMeetingSummary(meeting: any): Promise<string> {
    // Generate a structured summary of the meeting
    const summary = {
      title: meeting.title,
      date: meeting.scheduledAt,
      duration: meeting.duration,
      attendees: meeting.attendees.map((a) => ({
        name: `${a.member.user.firstName} ${a.member.user.lastName}`,
        present: a.isPresent,
      })),
      agendaItems: meeting.agendaItems.map((item) => ({
        title: item.title,
        notes: item.notes,
        decisions: item.decisions?.map((d) => ({
          title: d.title,
          outcome: d.outcome,
          votes: {
            for: d.votes.filter((v) => v.vote === 'FOR').length,
            against: d.votes.filter((v) => v.vote === 'AGAINST').length,
            abstain: d.votes.filter((v) => v.vote === 'ABSTAIN').length,
          },
        })),
      })),
      decisions: meeting.decisions.map((d) => ({
        title: d.title,
        outcome: d.outcome,
        votes: {
          for: d.votes.filter((v) => v.vote === 'FOR').length,
          against: d.votes.filter((v) => v.vote === 'AGAINST').length,
          abstain: d.votes.filter((v) => v.vote === 'ABSTAIN').length,
        },
      })),
    };

    return JSON.stringify(summary, null, 2);
  }

  private async verifyCompanyMember(companyId: string, userId: string) {
    const member = await this.prisma.companyMember.findFirst({
      where: {
        companyId,
        userId,
        status: 'ACTIVE',
      },
    });

    if (!member) {
      throw new ForbiddenException('Access denied: Not a member of this company');
    }

    return member;
  }
}
