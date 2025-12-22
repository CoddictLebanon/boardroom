import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WsException,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';
import { verifyToken } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  sessionId?: string;
}

interface JoinMeetingPayload {
  meetingId: string;
}

interface VotePayload {
  decisionId: string;
  vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
}

interface AttendancePayload {
  meetingId: string;
  isPresent: boolean;
}

interface MeetingStatusPayload {
  meetingId: string;
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
}

@WebSocketGateway({
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  },
  namespace: '/meetings',
})
export class MeetingsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  private readonly logger = new Logger(MeetingsGateway.name);
  private server: Server;

  // Track users in each meeting room
  private meetingRooms: Map<string, Set<string>> = new Map();

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.server = server;
    this.logger.log('Meetings WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractToken(client);
      if (!token) {
        this.logger.warn(`Client ${client.id} connection rejected: No token`);
        client.disconnect();
        return;
      }

      const verifiedToken = await verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
      });
      client.userId = verifiedToken.sub;
      client.sessionId = verifiedToken.sid;

      this.logger.log(
        `Client ${client.id} connected (User: ${client.userId})`,
      );
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(
        `Client ${client.id} authentication failed: ${errorMessage}`,
      );
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    // Remove user from all meeting rooms
    this.meetingRooms.forEach((users, meetingId) => {
      if (client.userId && users.has(client.userId)) {
        users.delete(client.userId);
        this.server.to(meetingId).emit('attendee:left', {
          userId: client.userId,
          meetingId,
        });
      }
    });

    this.logger.log(
      `Client ${client.id} disconnected (User: ${client.userId || 'unknown'})`,
    );
  }

  private extractToken(client: Socket): string | null {
    // Try handshake auth first
    const authToken = client.handshake.auth?.token;
    if (authToken) {
      return authToken;
    }

    // Fall back to authorization header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      return authHeader.slice(7);
    }

    return null;
  }

  @SubscribeMessage('meeting:join')
  async handleJoinMeeting(
    @MessageBody() payload: JoinMeetingPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const { meetingId } = payload;

    // Verify user has access to this meeting
    const hasAccess = await this.verifyMeetingAccess(client.userId, meetingId);
    if (!hasAccess) {
      throw new WsException('Access denied to this meeting');
    }

    // Join the socket room
    await client.join(meetingId);

    // Track user in meeting room
    if (!this.meetingRooms.has(meetingId)) {
      this.meetingRooms.set(meetingId, new Set());
    }
    this.meetingRooms.get(meetingId)!.add(client.userId);

    // Notify others in the meeting
    client.to(meetingId).emit('attendee:joined', {
      userId: client.userId,
      meetingId,
    });

    // Get current attendees
    const currentAttendees = Array.from(
      this.meetingRooms.get(meetingId) || [],
    );

    this.logger.log(
      `User ${client.userId} joined meeting ${meetingId}`,
    );

    return {
      success: true,
      meetingId,
      currentAttendees,
    };
  }

  @SubscribeMessage('meeting:leave')
  async handleLeaveMeeting(
    @MessageBody() payload: JoinMeetingPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const { meetingId } = payload;

    // Leave the socket room
    await client.leave(meetingId);

    // Remove user from tracking
    if (this.meetingRooms.has(meetingId)) {
      this.meetingRooms.get(meetingId)!.delete(client.userId);
    }

    // Notify others
    this.server.to(meetingId).emit('attendee:left', {
      userId: client.userId,
      meetingId,
    });

    this.logger.log(
      `User ${client.userId} left meeting ${meetingId}`,
    );

    return { success: true };
  }

  @SubscribeMessage('vote:cast')
  async handleCastVote(
    @MessageBody() payload: VotePayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const { decisionId, vote } = payload;

    // Get the decision and meeting info
    const decision = await this.prisma.decision.findUnique({
      where: { id: decisionId },
      include: { meeting: true },
    });

    if (!decision) {
      throw new WsException('Decision not found');
    }

    // Verify user has access to the meeting
    const hasAccess = await this.verifyMeetingAccess(
      client.userId,
      decision.meetingId,
    );
    if (!hasAccess) {
      throw new WsException('Access denied');
    }

    // Verify meeting is in progress
    if (decision.meeting.status !== 'IN_PROGRESS') {
      throw new WsException('Voting is only allowed during live meetings');
    }

    // Verify user is a present attendee
    const attendee = await this.prisma.meetingAttendee.findFirst({
      where: {
        meetingId: decision.meetingId,
        member: { userId: client.userId },
        isPresent: true,
      },
    });
    if (!attendee) {
      throw new WsException('Only present attendees can vote');
    }

    // The User.id IS the Clerk user ID in our schema
    // Upsert the vote using the Clerk userId directly
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

    // Get updated vote tally
    const voteTally = await this.getVoteTally(decisionId);

    // Broadcast to all in the meeting room
    this.server.to(decision.meetingId).emit('vote:updated', {
      decisionId,
      voterId: client.userId,
      vote,
      tally: voteTally,
    });

    this.logger.log(
      `User ${client.userId} voted ${vote} on decision ${decisionId}`,
    );

    return {
      success: true,
      vote: voteRecord,
      tally: voteTally,
    };
  }

  @SubscribeMessage('attendance:update')
  async handleAttendanceUpdate(
    @MessageBody() payload: AttendancePayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const { meetingId, isPresent } = payload;

    // Verify access
    const hasAccess = await this.verifyMeetingAccess(client.userId, meetingId);
    if (!hasAccess) {
      throw new WsException('Access denied');
    }

    // Find the meeting to get companyId
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) {
      throw new WsException('Meeting not found');
    }

    // Find the member record (User.id IS the Clerk userId)
    const member = await this.prisma.companyMember.findUnique({
      where: {
        userId_companyId: {
          userId: client.userId,
          companyId: meeting.companyId,
        },
      },
    });

    if (!member) {
      throw new WsException('Not a member of this company');
    }

    // Update attendance
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

    // Broadcast to meeting room
    this.server.to(meetingId).emit('attendance:updated', {
      meetingId,
      userId: client.userId,
      isPresent,
    });

    this.logger.log(
      `User ${client.userId} attendance updated to ${isPresent} for meeting ${meetingId}`,
    );

    return { success: true };
  }

  @SubscribeMessage('meeting:status')
  async handleMeetingStatusUpdate(
    @MessageBody() payload: MeetingStatusPayload,
    @ConnectedSocket() client: AuthenticatedSocket,
  ) {
    if (!client.userId) {
      throw new WsException('Not authenticated');
    }

    const { meetingId, status } = payload;

    // Verify admin access
    const hasAdminAccess = await this.verifyAdminAccess(
      client.userId,
      meetingId,
    );
    if (!hasAdminAccess) {
      throw new WsException('Admin access required');
    }

    // Update meeting status
    const meeting = await this.prisma.meeting.update({
      where: { id: meetingId },
      data: { status },
    });

    // Broadcast to meeting room
    this.server.to(meetingId).emit('meeting:status:updated', {
      meetingId,
      status,
      updatedAt: meeting.updatedAt,
    });

    this.logger.log(
      `Meeting ${meetingId} status updated to ${status} by user ${client.userId}`,
    );

    return { success: true, meeting };
  }

  private async verifyMeetingAccess(
    userId: string,
    meetingId: string,
  ): Promise<boolean> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) return false;

    // Check if user is a member of the company (User.id IS the Clerk userId)
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

  private async verifyAdminAccess(
    userId: string,
    meetingId: string,
  ): Promise<boolean> {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting) return false;

    // Check if user is OWNER or ADMIN (User.id IS the Clerk userId)
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

  private async getVoteTally(decisionId: string) {
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

  // Public method to emit events from other services
  emitToMeeting(meetingId: string, event: string, data: any) {
    this.server.to(meetingId).emit(event, data);
  }
}
