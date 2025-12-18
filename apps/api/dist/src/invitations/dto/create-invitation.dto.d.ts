import { MemberRole } from '@prisma/client';
export declare class CreateInvitationDto {
    email: string;
    role?: MemberRole;
    title?: string;
}
