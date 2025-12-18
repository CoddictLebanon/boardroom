import { PrismaService } from '../prisma/prisma.service';
import { CreateCompanyDto, UpdateCompanyDto, AddMemberDto, UpdateMemberDto } from './dto';
export declare class CompaniesService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    create(userId: string, createCompanyDto: CreateCompanyDto): Promise<({
        members: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            role: import("@prisma/client").$Enums.MemberRole;
            userId: string;
            companyId: string;
            termStart: Date | null;
            termEnd: Date | null;
            status: import("@prisma/client").$Enums.MemberStatus;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logo: string | null;
        timezone: string;
        fiscalYearStart: number;
    }) | null>;
    findUserCompanies(userId: string): Promise<({
        members: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            role: import("@prisma/client").$Enums.MemberRole;
            userId: string;
            companyId: string;
            termStart: Date | null;
            termEnd: Date | null;
            status: import("@prisma/client").$Enums.MemberStatus;
        })[];
        _count: {
            meetings: number;
            documents: number;
            actionItems: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logo: string | null;
        timezone: string;
        fiscalYearStart: number;
    })[]>;
    findOne(companyId: string, userId: string): Promise<{
        members: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            role: import("@prisma/client").$Enums.MemberRole;
            userId: string;
            companyId: string;
            termStart: Date | null;
            termEnd: Date | null;
            status: import("@prisma/client").$Enums.MemberStatus;
        })[];
        _count: {
            meetings: number;
            documents: number;
            actionItems: number;
            resolutions: number;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logo: string | null;
        timezone: string;
        fiscalYearStart: number;
    }>;
    update(companyId: string, userId: string, updateCompanyDto: UpdateCompanyDto): Promise<{
        members: ({
            user: {
                id: string;
                email: string;
                firstName: string | null;
                lastName: string | null;
                imageUrl: string | null;
            };
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            title: string | null;
            role: import("@prisma/client").$Enums.MemberRole;
            userId: string;
            companyId: string;
            termStart: Date | null;
            termEnd: Date | null;
            status: import("@prisma/client").$Enums.MemberStatus;
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        logo: string | null;
        timezone: string;
        fiscalYearStart: number;
    }>;
    addMember(companyId: string, userId: string, addMemberDto: AddMemberDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        role: import("@prisma/client").$Enums.MemberRole;
        userId: string;
        companyId: string;
        termStart: Date | null;
        termEnd: Date | null;
        status: import("@prisma/client").$Enums.MemberStatus;
    }>;
    updateMember(companyId: string, memberId: string, userId: string, updateMemberDto: UpdateMemberDto): Promise<{
        user: {
            id: string;
            email: string;
            firstName: string | null;
            lastName: string | null;
            imageUrl: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        title: string | null;
        role: import("@prisma/client").$Enums.MemberRole;
        userId: string;
        companyId: string;
        termStart: Date | null;
        termEnd: Date | null;
        status: import("@prisma/client").$Enums.MemberStatus;
    }>;
    removeMember(companyId: string, memberId: string, userId: string): Promise<{
        message: string;
    }>;
    private getUserMembership;
    private checkAdminAccess;
}
