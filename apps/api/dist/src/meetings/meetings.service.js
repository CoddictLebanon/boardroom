"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let MeetingsService = class MeetingsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createMeeting(companyId, userId, dto) {
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
                status: client_1.MeetingStatus.SCHEDULED,
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
    async getMeetings(companyId, userId, filters) {
        await this.verifyCompanyMember(companyId, userId);
        const where = {
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
                in: [client_1.MeetingStatus.SCHEDULED, client_1.MeetingStatus.IN_PROGRESS],
            };
        }
        if (filters?.past) {
            where.OR = [
                { scheduledAt: { lt: new Date() } },
                { status: client_1.MeetingStatus.COMPLETED },
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
    async getMeeting(id, userId) {
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
                summary: true,
            },
        });
        if (!meeting) {
            throw new common_1.NotFoundException('Meeting not found');
        }
        await this.verifyCompanyMember(meeting.companyId, userId);
        return meeting;
    }
    async updateMeeting(id, userId, dto) {
        const meeting = await this.getMeeting(id, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot update a completed meeting');
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
    async cancelMeeting(id, userId) {
        const meeting = await this.getMeeting(id, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot cancel a completed meeting');
        }
        if (meeting.status === client_1.MeetingStatus.CANCELLED) {
            throw new common_1.BadRequestException('Meeting is already cancelled');
        }
        const updated = await this.prisma.meeting.update({
            where: { id },
            data: {
                status: client_1.MeetingStatus.CANCELLED,
            },
        });
        return updated;
    }
    async addAgendaItem(meetingId, userId, dto) {
        const meeting = await this.getMeeting(meetingId, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot add agenda items to a completed meeting');
        }
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
            },
        });
        return agendaItem;
    }
    async updateAgendaItem(meetingId, itemId, userId, dto) {
        const meeting = await this.getMeeting(meetingId, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot update agenda items of a completed meeting');
        }
        const agendaItem = await this.prisma.agendaItem.findFirst({
            where: {
                id: itemId,
                meetingId,
            },
        });
        if (!agendaItem) {
            throw new common_1.NotFoundException('Agenda item not found');
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
    async addAttendees(meetingId, userId, dto) {
        const meeting = await this.getMeeting(meetingId, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot add attendees to a completed meeting');
        }
        const members = await this.prisma.companyMember.findMany({
            where: {
                id: { in: dto.memberIds },
                companyId: meeting.companyId,
            },
        });
        if (members.length !== dto.memberIds.length) {
            throw new common_1.BadRequestException('One or more members not found in company');
        }
        const attendees = await Promise.all(dto.memberIds.map(async (memberId) => {
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
        }));
        return attendees;
    }
    async markAttendance(meetingId, attendeeId, userId, dto) {
        const meeting = await this.getMeeting(meetingId, userId);
        const attendee = await this.prisma.meetingAttendee.findFirst({
            where: {
                id: attendeeId,
                meetingId,
            },
        });
        if (!attendee) {
            throw new common_1.NotFoundException('Attendee not found');
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
    async createDecision(meetingId, userId, dto) {
        const meeting = await this.getMeeting(meetingId, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Cannot create decisions for a completed meeting');
        }
        if (dto.agendaItemId) {
            const agendaItem = await this.prisma.agendaItem.findFirst({
                where: {
                    id: dto.agendaItemId,
                    meetingId,
                },
            });
            if (!agendaItem) {
                throw new common_1.NotFoundException('Agenda item not found');
            }
        }
        const decision = await this.prisma.decision.create({
            data: {
                meetingId,
                agendaItemId: dto.agendaItemId,
                title: dto.title,
                description: dto.description,
            },
            include: {
                votes: {
                    include: {
                        user: true,
                    },
                },
                agendaItem: true,
            },
        });
        return decision;
    }
    async castVote(meetingId, decisionId, userId, dto) {
        const meeting = await this.getMeeting(meetingId, userId);
        if (meeting.status !== client_1.MeetingStatus.IN_PROGRESS) {
            throw new common_1.BadRequestException('Voting is only allowed during in-progress meetings');
        }
        const decision = await this.prisma.decision.findFirst({
            where: {
                id: decisionId,
                meetingId,
            },
        });
        if (!decision) {
            throw new common_1.NotFoundException('Decision not found');
        }
        const isAttendee = meeting.attendees.some((attendee) => attendee.member.userId === userId);
        if (!isAttendee) {
            throw new common_1.ForbiddenException('Only meeting attendees can vote');
        }
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
        return vote;
    }
    async completeMeeting(meetingId, userId) {
        const meeting = await this.getMeeting(meetingId, userId);
        if (meeting.status === client_1.MeetingStatus.COMPLETED) {
            throw new common_1.BadRequestException('Meeting is already completed');
        }
        if (meeting.status === client_1.MeetingStatus.CANCELLED) {
            throw new common_1.BadRequestException('Cannot complete a cancelled meeting');
        }
        const decisionsWithVotes = await this.prisma.decision.findMany({
            where: { meetingId },
            include: {
                votes: true,
            },
        });
        await Promise.all(decisionsWithVotes.map(async (decision) => {
            const forVotes = decision.votes.filter((v) => v.vote === 'FOR').length;
            const againstVotes = decision.votes.filter((v) => v.vote === 'AGAINST').length;
            let outcome;
            if (forVotes > againstVotes) {
                outcome = client_1.DecisionOutcome.PASSED;
            }
            else if (againstVotes > forVotes) {
                outcome = client_1.DecisionOutcome.REJECTED;
            }
            else {
                outcome = client_1.DecisionOutcome.TABLED;
            }
            return this.prisma.decision.update({
                where: { id: decision.id },
                data: { outcome },
            });
        }));
        const summary = await this.generateMeetingSummary(meeting);
        const updated = await this.prisma.meeting.update({
            where: { id: meetingId },
            data: {
                status: client_1.MeetingStatus.COMPLETED,
                summary: {
                    create: {
                        content: summary,
                    },
                },
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
        return updated;
    }
    async generateMeetingSummary(meeting) {
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
    async verifyCompanyMember(companyId, userId) {
        const member = await this.prisma.companyMember.findFirst({
            where: {
                companyId,
                userId,
                status: 'ACTIVE',
            },
        });
        if (!member) {
            throw new common_1.ForbiddenException('Access denied: Not a member of this company');
        }
        return member;
    }
};
exports.MeetingsService = MeetingsService;
exports.MeetingsService = MeetingsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MeetingsService);
//# sourceMappingURL=meetings.service.js.map