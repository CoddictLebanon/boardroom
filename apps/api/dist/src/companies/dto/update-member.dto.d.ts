import { MemberRole, MemberStatus } from '@prisma/client';
export declare class UpdateMemberDto {
    role?: MemberRole;
    title?: string;
    termStart?: string;
    termEnd?: string;
    status?: MemberStatus;
}
