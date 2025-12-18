import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
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
export declare class MeetingsGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private readonly clerkClient;
    private server;
    private meetingRooms;
    constructor(configService: ConfigService, prisma: PrismaService);
    afterInit(server: Server): void;
    handleConnection(client: AuthenticatedSocket): Promise<void>;
    handleDisconnect(client: AuthenticatedSocket): void;
    private extractToken;
    handleJoinMeeting(payload: JoinMeetingPayload, client: AuthenticatedSocket): Promise<{
        success: boolean;
        meetingId: string;
        currentAttendees: string[];
    }>;
    handleLeaveMeeting(payload: JoinMeetingPayload, client: AuthenticatedSocket): Promise<{
        success: boolean;
    }>;
    handleCastVote(payload: VotePayload, client: AuthenticatedSocket): Promise<{
        success: boolean;
        vote: {
            vote: import("@prisma/client").$Enums.VoteType;
            id: string;
            createdAt: Date;
            userId: string;
            decisionId: string;
        };
        tally: {
            for: number;
            against: number;
            abstain: number;
        };
    }>;
    handleAttendanceUpdate(payload: AttendancePayload, client: AuthenticatedSocket): Promise<{
        success: boolean;
    }>;
    handleMeetingStatusUpdate(payload: MeetingStatusPayload, client: AuthenticatedSocket): Promise<{
        success: boolean;
        meeting: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            description: string | null;
            title: string;
            companyId: string;
            status: import("@prisma/client").$Enums.MeetingStatus;
            scheduledAt: Date;
            duration: number;
            location: string | null;
            videoLink: string | null;
        };
    }>;
    private verifyMeetingAccess;
    private verifyAdminAccess;
    private getVoteTally;
    emitToMeeting(meetingId: string, event: string, data: any): void;
}
export {};
