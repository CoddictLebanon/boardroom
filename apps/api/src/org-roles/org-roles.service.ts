import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrgRoleDto, UpdateOrgRoleDto } from './dto';

@Injectable()
export class OrgRolesService {
  constructor(private prisma: PrismaService) {}

  async findAll(companyId: string, userId: string) {
    await this.verifyCompanyAccess(userId, companyId);

    return this.prisma.orgRole.findMany({
      where: { companyId },
      include: {
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true, personName: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string, userId: string) {
    const role = await this.prisma.orgRole.findUnique({
      where: { id },
      include: {
        parent: true,
        children: true,
      },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.verifyCompanyAccess(userId, role.companyId);
    return role;
  }

  async create(companyId: string, userId: string, dto: CreateOrgRoleDto) {
    await this.verifyCompanyAccess(userId, companyId);

    // Verify parent exists if provided
    if (dto.parentId) {
      const parent = await this.prisma.orgRole.findFirst({
        where: { id: dto.parentId, companyId },
      });
      if (!parent) {
        throw new NotFoundException('Parent role not found');
      }
    }

    return this.prisma.orgRole.create({
      data: {
        companyId,
        title: dto.title,
        personName: dto.personName,
        responsibilities: dto.responsibilities,
        department: dto.department,
        employmentType: dto.employmentType,
        parentId: dto.parentId,
      },
      include: {
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true } },
      },
    });
  }

  async update(id: string, userId: string, dto: UpdateOrgRoleDto) {
    const existing = await this.prisma.orgRole.findUnique({
      where: { id },
    });

    if (!existing) {
      throw new NotFoundException('Role not found');
    }

    await this.verifyCompanyAccess(userId, existing.companyId);

    // Prevent circular reference
    if (dto.parentId) {
      if (dto.parentId === id) {
        throw new ForbiddenException('Role cannot be its own parent');
      }
      // Check if new parent is a descendant of this role
      const isDescendant = await this.isDescendant(dto.parentId, id);
      if (isDescendant) {
        throw new ForbiddenException('Cannot set a descendant as parent');
      }
    }

    return this.prisma.orgRole.update({
      where: { id },
      data: {
        title: dto.title,
        personName: dto.personName,
        responsibilities: dto.responsibilities,
        department: dto.department,
        employmentType: dto.employmentType,
        parentId: dto.parentId,
        positionX: dto.positionX,
        positionY: dto.positionY,
      },
      include: {
        parent: { select: { id: true, title: true } },
        children: { select: { id: true, title: true } },
      },
    });
  }

  async remove(id: string, userId: string) {
    const role = await this.prisma.orgRole.findUnique({
      where: { id },
      include: { children: true },
    });

    if (!role) {
      throw new NotFoundException('Role not found');
    }

    await this.verifyCompanyAccess(userId, role.companyId);

    // Move children to deleted role's parent
    if (role.children.length > 0) {
      await this.prisma.orgRole.updateMany({
        where: { parentId: id },
        data: { parentId: role.parentId },
      });
    }

    await this.prisma.orgRole.delete({ where: { id } });

    return { message: 'Role deleted successfully' };
  }

  async updatePositions(companyId: string, userId: string, positions: { id: string; x: number; y: number }[]) {
    await this.verifyCompanyAccess(userId, companyId);

    const updates = positions.map((pos) =>
      this.prisma.orgRole.update({
        where: { id: pos.id },
        data: { positionX: pos.x, positionY: pos.y },
      })
    );

    await this.prisma.$transaction(updates);
    return { message: 'Positions updated' };
  }

  private async isDescendant(potentialDescendantId: string, ancestorId: string): Promise<boolean> {
    const role = await this.prisma.orgRole.findUnique({
      where: { id: potentialDescendantId },
      select: { parentId: true },
    });

    if (!role || !role.parentId) return false;
    if (role.parentId === ancestorId) return true;

    return this.isDescendant(role.parentId, ancestorId);
  }

  private async verifyCompanyAccess(userId: string, companyId: string) {
    const membership = await this.prisma.companyMember.findFirst({
      where: { userId, companyId, status: 'ACTIVE' },
    });

    if (!membership) {
      throw new ForbiddenException('Access denied');
    }

    return membership;
  }
}
