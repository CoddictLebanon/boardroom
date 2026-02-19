import { Test, TestingModule } from '@nestjs/testing';
import { MeetingsService } from '../meetings.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailService } from '../../email/email.service';
import { MeetingsGateway } from '../../gateway/meetings.gateway';
import { PermissionsService } from '../../permissions/permissions.service';

describe('MeetingsService.reorderAgendaItems', () => {
  let service: MeetingsService;

  const mockMeeting = {
    id: 'meeting-1',
    companyId: 'company-1',
    status: 'SCHEDULED',
    attendees: [{ memberId: 'member-1', member: { userId: 'user-1' } }],
  };

  const mockAgendaItems = [
    { id: 'item-a', meetingId: 'meeting-1', order: 0 },
    { id: 'item-b', meetingId: 'meeting-1', order: 1 },
    { id: 'item-c', meetingId: 'meeting-1', order: 2 },
  ];

  const mockPrisma = {
    meeting: {
      findFirst: jest.fn().mockResolvedValue(mockMeeting),
      findUnique: jest.fn().mockResolvedValue(mockMeeting),
    },
    companyMember: {
      findFirst: jest.fn().mockResolvedValue({ id: 'member-1', userId: 'user-1' }),
    },
    agendaItem: {
      update: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  const mockGateway = {
    emitToMeeting: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MeetingsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: EmailService, useValue: { sendMeetingSummary: jest.fn() } },
        { provide: MeetingsGateway, useValue: mockGateway },
        { provide: PermissionsService, useValue: { hasPermission: jest.fn().mockResolvedValue(true) } },
      ],
    }).compile();

    service = module.get<MeetingsService>(MeetingsService);
    jest.clearAllMocks();
    mockPrisma.meeting.findFirst.mockResolvedValue(mockMeeting);
    mockPrisma.meeting.findUnique.mockResolvedValue(mockMeeting);
    mockPrisma.companyMember.findFirst.mockResolvedValue({ id: 'member-1', userId: 'user-1' });
  });

  it('updates each agenda item with its new order index', async () => {
    const reorderedIds = ['item-c', 'item-a', 'item-b'];
    const updatedItems = reorderedIds.map((id, index) => ({ id, order: index }));
    mockPrisma.$transaction.mockResolvedValue(updatedItems);
    mockPrisma.agendaItem.update.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'x', order: data.order }),
    );

    await service.reorderAgendaItems('meeting-1', reorderedIds, 'user-1');

    expect(mockPrisma.agendaItem.update).toHaveBeenCalledTimes(3);
    expect(mockPrisma.agendaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'item-c' }, data: { order: 0 } }),
    );
    expect(mockPrisma.agendaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'item-a' }, data: { order: 1 } }),
    );
    expect(mockPrisma.agendaItem.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'item-b' }, data: { order: 2 } }),
    );
  });

  it('runs all updates in a single transaction', async () => {
    mockPrisma.$transaction.mockResolvedValue(mockAgendaItems);

    await service.reorderAgendaItems('meeting-1', ['item-a', 'item-b', 'item-c'], 'user-1');

    expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
  });

  it('emits agenda:reordered socket event with item ids', async () => {
    const reorderedIds = ['item-c', 'item-a', 'item-b'];
    mockPrisma.$transaction.mockResolvedValue(mockAgendaItems);

    await service.reorderAgendaItems('meeting-1', reorderedIds, 'user-1');

    expect(mockGateway.emitToMeeting).toHaveBeenCalledWith(
      'meeting-1',
      'agenda:reordered',
      { itemIds: reorderedIds },
    );
  });
});
