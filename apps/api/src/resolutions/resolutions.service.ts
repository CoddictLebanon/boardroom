import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateResolutionDto, UpdateResolutionDto } from './dto';
import { ResolutionStatus, ResolutionCategory } from '@prisma/client';

@Injectable()
export class ResolutionsService {
  constructor(private prisma: PrismaService) {}

  async create(companyId: string, createDto: CreateResolutionDto) {
    // Generate resolution number
    const resolutionNumber = await this.generateResolutionNumber(companyId);

    return this.prisma.resolution.create({
      data: {
        companyId,
        number: resolutionNumber,
        title: createDto.title,
        content: createDto.content,
        category: createDto.category,
        status: createDto.status || ResolutionStatus.DRAFT,
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

  async findAll(
    companyId: string,
    filters?: {
      status?: ResolutionStatus;
      category?: ResolutionCategory;
      year?: number;
    },
  ) {
    const where: any = { companyId };

    if (filters?.status) {
      where.status = filters.status;
    }

    if (filters?.category) {
      where.category = filters.category;
    }

    if (filters?.year) {
      // Filter by resolution number that starts with RES-{YEAR}-
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

  async findOne(id: string) {
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
        signatures: {
          include: {
            user: {
              select: {
                id: true,
                email: true,
                firstName: true,
                lastName: true,
                signatureUrl: true,
              },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!resolution) {
      throw new NotFoundException(`Resolution with ID ${id} not found`);
    }

    return resolution;
  }

  async update(id: string, updateDto: UpdateResolutionDto) {
    const resolution = await this.findOne(id);

    // Check if resolution is in a state that allows updates
    if (
      resolution.status === ResolutionStatus.PASSED &&
      (updateDto.status || updateDto.content || updateDto.title)
    ) {
      throw new ForbiddenException(
        'Cannot modify core content of a passed resolution',
      );
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

  async updateStatus(id: string, status: ResolutionStatus) {
    const resolution = await this.findOne(id);

    // Validate status transitions
    if (resolution.status === ResolutionStatus.PASSED) {
      throw new ForbiddenException('Cannot change status of a passed resolution');
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

  async remove(id: string) {
    const resolution = await this.findOne(id);

    // Only allow deletion of DRAFT resolutions
    if (resolution.status !== ResolutionStatus.DRAFT) {
      throw new ForbiddenException(
        'Only resolutions in DRAFT status can be deleted',
      );
    }

    await this.prisma.resolution.delete({
      where: { id },
    });

    return { message: 'Resolution deleted successfully' };
  }

  async duplicate(id: string, userId: string) {
    const original = await this.findOne(id);
    const newNumber = await this.generateResolutionNumber(original.companyId);

    return this.prisma.resolution.create({
      data: {
        companyId: original.companyId,
        number: newNumber,
        title: `Copy of ${original.title}`,
        content: original.content,
        category: original.category,
        status: ResolutionStatus.DRAFT,
        createdById: userId,
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

  async getNextResolutionNumber(companyId: string): Promise<string> {
    return this.generateResolutionNumber(companyId);
  }

  async addSigners(
    resolutionId: string,
    signers: { userId: string; order?: number }[],
    includeStamp?: boolean,
  ) {
    const resolution = await this.findOne(resolutionId);

    // Prevent modifying signers on passed resolutions
    if (resolution.status === ResolutionStatus.PASSED) {
      throw new ForbiddenException('Cannot modify signers on a passed resolution');
    }

    // Validate that all users are members of the company
    for (const signer of signers) {
      const member = await this.prisma.companyMember.findUnique({
        where: {
          userId_companyId: {
            userId: signer.userId,
            companyId: resolution.companyId,
          },
        },
      });

      if (!member) {
        throw new BadRequestException(
          `User ${signer.userId} is not a member of this company`,
        );
      }
    }

    // Create signature records
    const signatureData = signers.map((signer, index) => ({
      resolutionId,
      userId: signer.userId,
      order: signer.order ?? index,
      status: 'PENDING' as const,
    }));

    // Use transaction to ensure atomicity
    await this.prisma.$transaction(async (tx) => {
      await tx.resolutionSignature.createMany({
        data: signatureData,
        skipDuplicates: true,
      });

      if (includeStamp !== undefined) {
        await tx.resolution.update({
          where: { id: resolutionId },
          data: { includeStamp },
        });
      }
    });

    return this.findOne(resolutionId);
  }

  async removeSigner(resolutionId: string, userId: string) {
    const resolution = await this.findOne(resolutionId);

    // Prevent modifying signers on passed resolutions
    if (resolution.status === ResolutionStatus.PASSED) {
      throw new ForbiddenException('Cannot modify signers on a passed resolution');
    }

    // Check if the signature exists
    const signature = await this.prisma.resolutionSignature.findUnique({
      where: { resolutionId_userId: { resolutionId, userId } },
    });

    if (!signature) {
      throw new NotFoundException('Signer not found for this resolution');
    }

    await this.prisma.resolutionSignature.delete({
      where: {
        resolutionId_userId: { resolutionId, userId },
      },
    });
    return this.findOne(resolutionId);
  }

  async signResolution(resolutionId: string, userId: string) {
    // Verify user has a signature uploaded
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.signatureUrl) {
      throw new BadRequestException('You must upload a signature before signing');
    }

    // Check if the signature record exists
    const signature = await this.prisma.resolutionSignature.findUnique({
      where: { resolutionId_userId: { resolutionId, userId } },
    });

    if (!signature) {
      throw new NotFoundException('You are not assigned as a signer for this resolution');
    }

    // Update the signature record
    await this.prisma.resolutionSignature.update({
      where: {
        resolutionId_userId: { resolutionId, userId },
      },
      data: {
        status: 'SIGNED',
        signedAt: new Date(),
      },
    });

    return this.findOne(resolutionId);
  }

  private async generateResolutionNumber(companyId: string): Promise<string> {
    const currentYear = new Date().getFullYear();
    const prefix = `RES-${currentYear}-`;

    // Find the latest resolution number for this company and year
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
      // Extract the number from the resolution number (e.g., RES-2024-015 -> 15)
      const match = latestResolution.number.match(/RES-\d{4}-(\d+)/);
      if (match) {
        nextNumber = parseInt(match[1], 10) + 1;
      }
    }

    // Format with leading zeros (e.g., 015)
    const paddedNumber = nextNumber.toString().padStart(3, '0');
    return `${prefix}${paddedNumber}`;
  }
}
