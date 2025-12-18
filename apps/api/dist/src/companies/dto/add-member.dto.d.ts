import { MemberRole } from '@prisma/client';
export declare class AddMemberDto {
    userId: string;
    role?: MemberRole;
    title?: string;
    termStart?: string;
    termEnd?: string;
}
