import { ResolutionCategory, ResolutionStatus } from '@prisma/client';
export declare class UpdateResolutionDto {
    title?: string;
    content?: string;
    category?: ResolutionCategory;
    status?: ResolutionStatus;
    decisionId?: string;
    effectiveDate?: string;
}
