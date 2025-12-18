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
exports.ResolutionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let ResolutionsService = class ResolutionsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(companyId, createDto) {
        const resolutionNumber = await this.generateResolutionNumber(companyId);
        return this.prisma.resolution.create({
            data: {
                companyId,
                number: resolutionNumber,
                title: createDto.title,
                content: createDto.content,
                category: createDto.category,
                status: createDto.status || client_1.ResolutionStatus.DRAFT,
                decisionId: createDto.decisionId,
                effectiveDate: createDto.effectiveDate
                    ? new Date(createDto.effectiveDate)
                    : null,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                decision: {
                    include: {
                        meeting: {
                            select: {
                                id: true,
                                title: true,
                                scheduledAt: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async findAll(companyId, filters) {
        const where = { companyId };
        if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.category) {
            where.category = filters.category;
        }
        if (filters?.year) {
            where.number = {
                startsWith: `RES-${filters.year}-`,
            };
        }
        return this.prisma.resolution.findMany({
            where,
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                decision: {
                    include: {
                        meeting: {
                            select: {
                                id: true,
                                title: true,
                                scheduledAt: true,
                            },
                        },
                    },
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });
    }
    async findOne(id) {
        const resolution = await this.prisma.resolution.findUnique({
            where: { id },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                decision: {
                    include: {
                        meeting: {
                            select: {
                                id: true,
                                title: true,
                                scheduledAt: true,
                            },
                        },
                        votes: {
                            include: {
                                user: {
                                    select: {
                                        id: true,
                                        email: true,
                                        firstName: true,
                                        lastName: true,
                                    },
                                },
                            },
                        },
                    },
                },
            },
        });
        if (!resolution) {
            throw new common_1.NotFoundException(`Resolution with ID ${id} not found`);
        }
        return resolution;
    }
    async update(id, updateDto) {
        const resolution = await this.findOne(id);
        if (resolution.status === client_1.ResolutionStatus.PASSED &&
            (updateDto.status || updateDto.content || updateDto.title)) {
            throw new common_1.ForbiddenException('Cannot modify core content of a passed resolution');
        }
        return this.prisma.resolution.update({
            where: { id },
            data: {
                title: updateDto.title,
                content: updateDto.content,
                category: updateDto.category,
                status: updateDto.status,
                decisionId: updateDto.decisionId,
                effectiveDate: updateDto.effectiveDate
                    ? new Date(updateDto.effectiveDate)
                    : undefined,
            },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                decision: {
                    include: {
                        meeting: {
                            select: {
                                id: true,
                                title: true,
                                scheduledAt: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async updateStatus(id, status) {
        const resolution = await this.findOne(id);
        if (resolution.status === client_1.ResolutionStatus.PASSED) {
            throw new common_1.ForbiddenException('Cannot change status of a passed resolution');
        }
        return this.prisma.resolution.update({
            where: { id },
            data: { status },
            include: {
                company: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
                decision: {
                    include: {
                        meeting: {
                            select: {
                                id: true,
                                title: true,
                                scheduledAt: true,
                            },
                        },
                    },
                },
            },
        });
    }
    async remove(id) {
        const resolution = await this.findOne(id);
        if (resolution.status !== client_1.ResolutionStatus.DRAFT) {
            throw new common_1.ForbiddenException('Only resolutions in DRAFT status can be deleted');
        }
        await this.prisma.resolution.delete({
            where: { id },
        });
        return { message: 'Resolution deleted successfully' };
    }
    async getNextResolutionNumber(companyId) {
        return this.generateResolutionNumber(companyId);
    }
    async generateResolutionNumber(companyId) {
        const currentYear = new Date().getFullYear();
        const prefix = `RES-${currentYear}-`;
        const latestResolution = await this.prisma.resolution.findFirst({
            where: {
                companyId,
                number: {
                    startsWith: prefix,
                },
            },
            orderBy: {
                number: 'desc',
            },
        });
        let nextNumber = 1;
        if (latestResolution) {
            const match = latestResolution.number.match(/RES-\d{4}-(\d+)/);
            if (match) {
                nextNumber = parseInt(match[1], 10) + 1;
            }
        }
        const paddedNumber = nextNumber.toString().padStart(3, '0');
        return `${prefix}${paddedNumber}`;
    }
};
exports.ResolutionsService = ResolutionsService;
exports.ResolutionsService = ResolutionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ResolutionsService);
//# sourceMappingURL=resolutions.service.js.map