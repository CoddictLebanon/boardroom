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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var MeetingsGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const common_1 = require("@nestjs/common");
const backend_1 = require("@clerk/backend");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
let MeetingsGateway = MeetingsGateway_1 = class MeetingsGateway {
    configService;
    prisma;
    logger = new common_1.Logger(MeetingsGateway_1.name);
    clerkClient;
    server;
    meetingRooms = new Map();
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        this.clerkClient = (0, backend_1.createClerkClient)({
            secretKey: this.configService.get('CLERK_SECRET_KEY'),
        });
    }
    afterInit(server) {
        this.server = server;
        this.logger.log('Meetings WebSocket Gateway initialized');
    }
    async handleConnection(client) {
        try {
            const token = this.extractToken(client);
            if (!token) {
                this.logger.warn(`Client ${client.id} connection rejected: No token`);
                client.disconnect();
                return;
            }
            const verifiedToken = await this.clerkClient.verifyToken(token);
            client.userId = verifiedToken.sub;
            client.sessionId = verifiedToken.sid;
            this.logger.log(`Client ${client.id} connected (User: ${client.userId})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Client ${client.id} authentication failed: ${errorMessage}`);
            client.disconnect();
        }
    }
    handleDisconnect(client) {
        this.meetingRooms.forEach((users, meetingId) => {
            if (client.userId && users.has(client.userId)) {
                users.delete(client.userId);
                this.server.to(meetingId).emit('attendee:left', {
                    userId: client.userId,
                    meetingId,
                });
            }
        });
        this.logger.log(`Client ${client.id} disconnected (User: ${client.userId || 'unknown'})`);
    }
    extractToken(client) {
        const authToken = client.handshake.auth?.token;
        if (authToken) {
            return authToken;
        }
        const authHeader = client.handshake.headers.authorization;
        if (authHeader?.startsWith('Bearer ')) {
            return authHeader.slice(7);
        }
        return null;
    }
    async handleJoinMeeting(payload, client) {
        if (!client.userId) {
            throw new websockets_1.WsException('Not authenticated');
        }
        const { meetingId } = payload;
        const hasAccess = await this.verifyMeetingAccess(client.userId, meetingId);
        if (!hasAccess) {
            throw new websockets_1.WsException('Access denied to this meeting');
        }
        await client.join(meetingId);
        if (!this.meetingRooms.has(meetingId)) {
            this.meetingRooms.set(meetingId, new Set());
        }
        this.meetingRooms.get(meetingId).add(client.userId);
        client.to(meetingId).emit('attendee:joined', {
            userId: client.userId,
            meetingId,
        });
        const currentAttendees = Array.from(this.meetingRooms.get(meetingId) || []);
        this.logger.log(`User ${client.userId} joined meeting ${meetingId}`);
        return {
            success: true,
            meetingId,
            currentAttendees,
        };
    }
    async handleLeaveMeeting(payload, client) {
        if (!client.userId) {
            throw new websockets_1.WsException('Not authenticated');
        }
        const { meetingId } = payload;
        await client.leave(meetingId);
        if (this.meetingRooms.has(meetingId)) {
            this.meetingRooms.get(meetingId).delete(client.userId);
        }
        this.server.to(meetingId).emit('attendee:left', {
            userId: client.userId,
            meetingId,
        });
        this.logger.log(`User ${client.userId} left meeting ${meetingId}`);
        return { success: true };
    }
    async handleCastVote(payload, client) {
        if (!client.userId) {
            throw new websockets_1.WsException('Not authenticated');
        }
        const { decisionId, vote } = payload;
        const decision = await this.prisma.decision.findUnique({
            where: { id: decisionId },
            include: { meeting: true },
        });
        if (!decision) {
            throw new websockets_1.WsException('Decision not found');
        }
        const hasAccess = await this.verifyMeetingAccess(client.userId, decision.meetingId);
        if (!hasAccess) {
            throw new websockets_1.WsException('Access denied');
        }
        if (decision.meeting.status !== 'IN_PROGRESS') {
            throw new websockets_1.WsException('Voting is only allowed during live meetings');
        }
        const voteRecord = await this.prisma.vote.upsert({
            where: {
                decisionId_userId: {
                    decisionId,
                    userId: client.userId,
                },
            },
            update: { vote },
            create: {
                decisionId,
                userId: client.userId,
                vote,
            },
        });
        const voteTally = await this.getVoteTally(decisionId);
        this.server.to(decision.meetingId).emit('vote:updated', {
            decisionId,
            voterId: client.userId,
            vote,
            tally: voteTally,
        });
        this.logger.log(`User ${client.userId} voted ${vote} on decision ${decisionId}`);
        return {
            success: true,
            vote: voteRecord,
            tally: voteTally,
        };
    }
    async handleAttendanceUpdate(payload, client) {
        if (!client.userId) {
            throw new websockets_1.WsException('Not authenticated');
        }
        const { meetingId, isPresent } = payload;
        const hasAccess = await this.verifyMeetingAccess(client.userId, meetingId);
        if (!hasAccess) {
            throw new websockets_1.WsException('Access denied');
        }
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
        });
        if (!meeting) {
            throw new websockets_1.WsException('Meeting not found');
        }
        const member = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId: client.userId,
                    companyId: meeting.companyId,
                },
            },
        });
        if (!member) {
            throw new websockets_1.WsException('Not a member of this company');
        }
        await this.prisma.meetingAttendee.upsert({
            where: {
                meetingId_memberId: {
                    meetingId,
                    memberId: member.id,
                },
            },
            update: { isPresent },
            create: {
                meetingId,
                memberId: member.id,
                isPresent,
            },
        });
        this.server.to(meetingId).emit('attendance:updated', {
            meetingId,
            userId: client.userId,
            isPresent,
        });
        this.logger.log(`User ${client.userId} attendance updated to ${isPresent} for meeting ${meetingId}`);
        return { success: true };
    }
    async handleMeetingStatusUpdate(payload, client) {
        if (!client.userId) {
            throw new websockets_1.WsException('Not authenticated');
        }
        const { meetingId, status } = payload;
        const hasAdminAccess = await this.verifyAdminAccess(client.userId, meetingId);
        if (!hasAdminAccess) {
            throw new websockets_1.WsException('Admin access required');
        }
        const meeting = await this.prisma.meeting.update({
            where: { id: meetingId },
            data: { status },
        });
        this.server.to(meetingId).emit('meeting:status:updated', {
            meetingId,
            status,
            updatedAt: meeting.updatedAt,
        });
        this.logger.log(`Meeting ${meetingId} status updated to ${status} by user ${client.userId}`);
        return { success: true, meeting };
    }
    async verifyMeetingAccess(userId, meetingId) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
        });
        if (!meeting)
            return false;
        const member = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId: meeting.companyId,
                },
            },
        });
        return !!member;
    }
    async verifyAdminAccess(userId, meetingId) {
        const meeting = await this.prisma.meeting.findUnique({
            where: { id: meetingId },
        });
        if (!meeting)
            return false;
        const member = await this.prisma.companyMember.findUnique({
            where: {
                userId_companyId: {
                    userId,
                    companyId: meeting.companyId,
                },
            },
        });
        return member?.role === 'OWNER' || member?.role === 'ADMIN';
    }
    async getVoteTally(decisionId) {
        const votes = await this.prisma.vote.groupBy({
            by: ['vote'],
            where: { decisionId },
            _count: true,
        });
        return {
            for: votes.find((v) => v.vote === 'FOR')?._count || 0,
            against: votes.find((v) => v.vote === 'AGAINST')?._count || 0,
            abstain: votes.find((v) => v.vote === 'ABSTAIN')?._count || 0,
        };
    }
    emitToMeeting(meetingId, event, data) {
        this.server.to(meetingId).emit(event, data);
    }
};
exports.MeetingsGateway = MeetingsGateway;
__decorate([
    (0, websockets_1.SubscribeMessage)('meeting:join'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsGateway.prototype, "handleJoinMeeting", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('meeting:leave'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsGateway.prototype, "handleLeaveMeeting", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('vote:cast'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsGateway.prototype, "handleCastVote", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('attendance:update'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsGateway.prototype, "handleAttendanceUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('meeting:status'),
    __param(0, (0, websockets_1.MessageBody)()),
    __param(1, (0, websockets_1.ConnectedSocket)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], MeetingsGateway.prototype, "handleMeetingStatusUpdate", null);
exports.MeetingsGateway = MeetingsGateway = MeetingsGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: process.env.FRONTEND_URL || 'http://localhost:3000',
            credentials: true,
        },
        namespace: '/meetings',
    }),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MeetingsGateway);
//# sourceMappingURL=meetings.gateway.js.map