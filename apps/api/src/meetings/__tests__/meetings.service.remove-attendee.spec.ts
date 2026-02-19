import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { MeetingsService } from '../meetings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { MeetingsGateway } from '../../gateway/meetings.gateway';
import { PermissionsService } from '../../permissions/permissions.service';

describe('MeetingsService.removeAttendee', () => {
  let service: MeetingsService;

  const mockAttendee = {
    id: 'attendee-1',
    meetingId: 'meeting-1',
    memberId: 'member-2',
    member: { userId: 'user-2' },
  };

  const mockMeeting = (status = 'SCHEDULED') => ({
    id: 'meeting-1',
    companyId: 'company-1',
    status,
    attendees: [{ memberId: 'member-1', member: { userId: 'user-1' } }],
  });

  const mockPrisma = {
    meeting: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    companyMember: {
      findFirst: jest.fn().mockResolvedValue({ id: 'member-1', userId: 'user-1' }),
    },
    meetingAttendee: {
      findFirst: jest.fn(),
      delete: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: { sendMeetingSummary: jest.fn() } },
        { provide: MeetingsGateway, useValue: { emitToMeeting: jest.fn() } },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    jest.clearAllMocks();
    mockPrisma.meeting.findUnique.mockResolvedValue(mockMeeting());
    mockPrisma.companyMember.findFirst.mockResolvedValue({ id: 'member-1', userId: 'user-1' });
    mockPrisma.meetingAttendee.findFirst.mockResolvedValue(mockAttendee);
    mockPrisma.meetingAttendee.delete.mockResolvedValue(mockAttendee);
  });

  it('deletes the attendee record', async () => {
    await service.removeAttendee('meeting-1', 'attendee-1', 'user-1');

    expect(mockPrisma.meetingAttendee.delete).toHaveBeenCalledWith({
      where: { id: 'attendee-1' },
    });
  });

  it('throws NotFoundException when attendee does not exist in this meeting', async () => {
    mockPrisma.meetingAttendee.findFirst.mockResolvedValue(null);

    await expect(
      service.removeAttendee('meeting-1', 'attendee-1', 'user-1'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws BadRequestException when meeting is completed', async () => {
    mockPrisma.meeting.findUnique.mockResolvedValue(mockMeeting('COMPLETED'));

    await expect(
      service.removeAttendee('meeting-1', 'attendee-1', 'user-1'),
    ).rejects.toThrow(BadRequestException);
  });
});
