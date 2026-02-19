import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { InvitationsService } from '../invitations.service';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { EmailService } from '../../email/email.service';

describe('InvitationsService.revokeInvitation', () => {
  let service: InvitationsService;

  const mockInvitation = {
    id: 'invite-1',
    companyId: 'company-1',
    email: 'test@example.com',
    status: 'PENDING',
  };

  const mockPrisma = {
    invitation: {
      findFirst: jest.fn(),
      update: jest.fn(),
    },
    companyMember: {
      findUnique: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InvitationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ConfigService, useValue: { get: jest.fn() } },
        { provide: EmailService, useValue: { sendInvitationEmail: jest.fn() } },
      ],
    }).compile();

    service = module.get<InvitationsService>(InvitationsService);
    jest.clearAllMocks();

    mockPrisma.invitation.findFirst.mockResolvedValue(mockInvitation);
    mockPrisma.companyMember.findUnique.mockResolvedValue({
      id: 'member-1',
      userId: 'user-1',
      companyId: 'company-1',
      role: 'OWNER',
    });
    mockPrisma.invitation.update.mockResolvedValue({
      ...mockInvitation,
      status: 'REVOKED',
    });
  });

  it('marks invitation as REVOKED when owner revokes it', async () => {
    await service.revokeInvitation('invite-1', 'company-1', 'user-1');

    expect(mockPrisma.invitation.update).toHaveBeenCalledWith({
      where: { id: 'invite-1' },
      data: { status: 'REVOKED' },
    });
  });

  it('throws NotFoundException when invitation does not belong to company', async () => {
    // Simulates what happens when the frontend omits companyId from the URL —
    // the service uses companyId to scope the lookup, so a wrong/missing companyId
    // means the invitation is not found.
    mockPrisma.invitation.findFirst.mockResolvedValue(null);

    await expect(
      service.revokeInvitation('invite-1', 'wrong-company', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException when non-owner/admin tries to revoke', async () => {
    mockPrisma.companyMember.findUnique.mockResolvedValue({
      id: 'member-2',
      userId: 'user-2',
      companyId: 'company-1',
      role: 'BOARD_MEMBER',
    });

    await expect(
      service.revokeInvitation('invite-1', 'company-1', 'user-2'),
    ).rejects.toThrow(ForbiddenException);
  });
});
