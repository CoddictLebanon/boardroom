import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MemberRole } from '@prisma/client';
import { CreateCustomRoleDto } from './dto/create-custom-role.dto';
import { UpdateCustomRoleDto } from './dto/update-custom-role.dto';

const MAX_CUSTOM_ROLES = 5;

@Injectable()
export class CustomRolesService {
  constructor(private prisma: PrismaService) {}

  async verifyOwner(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership || membership.role !== MemberRole.OWNER) {
      throw new ForbiddenException('Only company owner can manage custom roles');
    }
  }

  async getCompanyCustomRoles(companyId: string) {
    return this.prisma.customRole.findMany({
      where: { companyId },
      orderBy: { name: 'asc' },
    });
  }

  async createCustomRole(companyId: string, dto: CreateCustomRoleDto) {
    // Check limit
    const count = await this.prisma.customRole.count({ where: { companyId } });
    if (count >= MAX_CUSTOM_ROLES) {
      throw new BadRequestException(
        `Maximum of ${MAX_CUSTOM_ROLES} custom roles allowed per company`,
      );
    }

    // Check for duplicate name
    const existing = await this.prisma.customRole.findFirst({
      where: { companyId, name: dto.name },
    });
    if (existing) {
      throw new ConflictException('A role with this name already exists');
    }

    return this.prisma.customRole.create({
      data: {
        companyId,
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async updateCustomRole(id: string, dto: UpdateCustomRoleDto) {
    const role = await this.prisma.customRole.findUnique({ where: { id } });
    if (!role) {
      throw new NotFoundException('Custom role not found');
    }

    // Check for duplicate name if changing
    if (dto.name && dto.name !== role.name) {
      const existing = await this.prisma.customRole.findFirst({
        where: { companyId: role.companyId, name: dto.name },
      });
      if (existing) {
        throw new ConflictException('A role with this name already exists');
      }
    }

    return this.prisma.customRole.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCustomRole(id: string) {
    const role = await this.prisma.customRole.findUnique({
      where: { id },
      include: { members: true },
    });

    if (!role) {
      throw new NotFoundException('Custom role not found');
    }

    if (role.members.length > 0) {
      throw new ConflictException(
        'Cannot delete role with assigned members. Reassign members first.',
      );
    }

    await this.prisma.customRole.delete({ where: { id } });
  }

  async getCompanyIdForRole(roleId: string): Promise<string> {
    const role = await this.prisma.customRole.findUnique({
      where: { id: roleId },
    });
    if (!role) {
      throw new NotFoundException('Custom role not found');
    }
    return role.companyId;
  }
}
