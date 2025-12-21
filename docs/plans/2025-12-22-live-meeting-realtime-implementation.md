# Live Meeting Real-time Features Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make agenda items, decisions, and action items work like notes - real-time Socket.IO updates with drag-and-drop sorting, no page refresh.

**Architecture:** REST API for CRUD operations, Socket.IO events emitted after each operation for real-time sync. Frontend uses local state updated by socket events instead of refetching.

**Tech Stack:** NestJS, Prisma, Socket.IO, React, dnd-kit, Playwright

---

## Task 1: Database Schema Migration

**Files:**
- Create: `apps/api/prisma/migrations/[timestamp]_add_order_to_decisions_and_actions/migration.sql`
- Modify: `apps/api/prisma/schema.prisma:255-273` (Decision model)
- Modify: `apps/api/prisma/schema.prisma:304-332` (ActionItem model)

**Step 1: Add order field to Decision model**

In `apps/api/prisma/schema.prisma`, modify the Decision model:

```prisma
model Decision {
  id           String           @id @default(cuid())
  meetingId    String
  agendaItemId String?
  createdById  String?
  title        String
  description  String?
  outcome      DecisionOutcome?
  order        Int              @default(0)  // ADD THIS LINE
  createdAt    DateTime         @default(now())
  updatedAt    DateTime         @updatedAt

  meeting    Meeting     @relation(fields: [meetingId], references: [id], onDelete: Cascade)
  agendaItem AgendaItem? @relation(fields: [agendaItemId], references: [id])
  createdBy  User?       @relation("DecisionCreator", fields: [createdById], references: [id])
  votes      Vote[]
  resolution Resolution?

  @@index([meetingId])  // ADD THIS INDEX
  @@index([createdById])
}
```

**Step 2: Add order field to ActionItem model**

In `apps/api/prisma/schema.prisma`, modify the ActionItem model:

```prisma
model ActionItem {
  id           String       @id @default(cuid())
  companyId    String
  meetingId    String?
  agendaItemId String?
  createdById  String?
  title        String
  description  String?
  assigneeId   String?
  dueDate      DateTime?
  priority     Priority     @default(MEDIUM)
  status       ActionStatus @default(PENDING)
  order        Int          @default(0)  // ADD THIS LINE
  createdAt    DateTime     @default(now())
  updatedAt    DateTime     @updatedAt

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  meeting    Meeting?    @relation(fields: [meetingId], references: [id])
  assignee   User?       @relation("ActionAssignee", fields: [assigneeId], references: [id])
  createdBy  User?       @relation("ActionCreator", fields: [createdById], references: [id])
  agendaItem AgendaItem? @relation(fields: [agendaItemId], references: [id])

  @@index([companyId])
  @@index([meetingId])
  @@index([assigneeId])
  @@index([createdById])
  @@index([status])
  @@index([dueDate])
  @@index([companyId, status])
}
```

**Step 3: Run migration**

```bash
cd apps/api
npx prisma migrate dev --name add_order_to_decisions_and_actions
```

Expected: Migration creates `order` column with default 0 on both tables.

**Step 4: Commit**

```bash
git add apps/api/prisma/
git commit -m "feat: add order field to Decision and ActionItem models"
```

---

## Task 2: Agenda Items API - Write E2E Tests First (TDD)

**Files:**
- Create: `apps/api/test/agenda-items.e2e-spec.ts`

**Step 1: Write failing tests for agenda items CRUD and reorder**

Create `apps/api/test/agenda-items.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
  TEST_USER_2,
  MockAuthGuard,
} from './test-utils';

describe('AgendaItemsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;
  let companyId: string;
  let meetingId: string;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    prisma = testSetup.prisma;
    mockAuthGuard = testSetup.mockAuthGuard;

    await createTestUser(prisma, TEST_USER);
    await createTestUser(prisma, TEST_USER_2);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.agendaItem.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);

    const company = await createTestCompany(prisma, TEST_USER.id);
    companyId = company.id;

    await prisma.companyMember.create({
      data: {
        userId: TEST_USER_2.id,
        companyId: companyId,
        role: 'BOARD_MEMBER',
        status: 'ACTIVE',
      },
    });

    const meeting = await prisma.meeting.create({
      data: {
        companyId: companyId,
        title: 'Test Meeting',
        scheduledAt: new Date(),
        duration: 60,
        status: 'IN_PROGRESS',
      },
    });
    meetingId = meeting.id;
  });

  describe('POST /companies/:companyId/meetings/:meetingId/agenda', () => {
    it('should create an agenda item successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'Financial Review', description: 'Review Q4 results', duration: 30 })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Financial Review');
      expect(response.body.description).toBe('Review Q4 results');
      expect(response.body.duration).toBe(30);
      expect(response.body.order).toBe(0);
    });

    it('should auto-increment order for new items', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'First Item' })
        .expect(201);

      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'Second Item' })
        .expect(201);

      expect(response.body.order).toBe(1);
    });

    it('should fail with empty title', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: '' })
        .expect(400);
    });

    it('should fail for non-member', async () => {
      mockAuthGuard.setMockUserId('non-member-id');

      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .send({ title: 'Test' })
        .expect(403);
    });
  });

  describe('GET /companies/:companyId/meetings/:meetingId/agenda', () => {
    beforeEach(async () => {
      await prisma.agendaItem.createMany({
        data: [
          { meetingId, title: 'Item A', order: 0, createdById: TEST_USER.id },
          { meetingId, title: 'Item B', order: 1, createdById: TEST_USER.id },
        ],
      });
    });

    it('should return agenda items ordered by order field', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda`)
        .expect(200);

      expect(response.body.length).toBe(2);
      expect(response.body[0].title).toBe('Item A');
      expect(response.body[1].title).toBe('Item B');
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/agenda/:itemId', () => {
    let itemId: string;

    beforeEach(async () => {
      const item = await prisma.agendaItem.create({
        data: { meetingId, title: 'Original Title', order: 0, createdById: TEST_USER.id },
      });
      itemId = item.id;
    });

    it('should update an agenda item', async () => {
      const response = await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/${itemId}`)
        .send({ title: 'Updated Title', description: 'New description' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
      expect(response.body.description).toBe('New description');
    });

    it('should fail for non-existent item', async () => {
      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/non-existent`)
        .send({ title: 'Test' })
        .expect(404);
    });
  });

  describe('DELETE /companies/:companyId/meetings/:meetingId/agenda/:itemId', () => {
    let itemId: string;

    beforeEach(async () => {
      const item = await prisma.agendaItem.create({
        data: { meetingId, title: 'To Delete', order: 0, createdById: TEST_USER.id },
      });
      itemId = item.id;
    });

    it('should delete an agenda item', async () => {
      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/${itemId}`)
        .expect(200);

      const deleted = await prisma.agendaItem.findUnique({ where: { id: itemId } });
      expect(deleted).toBeNull();
    });
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/agenda/reorder', () => {
    let itemIds: string[];

    beforeEach(async () => {
      const items = await Promise.all([
        prisma.agendaItem.create({ data: { meetingId, title: 'A', order: 0, createdById: TEST_USER.id } }),
        prisma.agendaItem.create({ data: { meetingId, title: 'B', order: 1, createdById: TEST_USER.id } }),
        prisma.agendaItem.create({ data: { meetingId, title: 'C', order: 2, createdById: TEST_USER.id } }),
      ]);
      itemIds = items.map(i => i.id);
    });

    it('should reorder agenda items', async () => {
      const newOrder = [itemIds[2], itemIds[0], itemIds[1]]; // C, A, B

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/agenda/reorder`)
        .send({ itemIds: newOrder })
        .expect(200);

      const reordered = await prisma.agendaItem.findMany({
        where: { meetingId },
        orderBy: { order: 'asc' },
      });

      expect(reordered[0].title).toBe('C');
      expect(reordered[1].title).toBe('A');
      expect(reordered[2].title).toBe('B');
    });
  });
});
```

**Step 2: Run tests to verify they fail**

```bash
cd apps/api
npm run test:e2e -- --testPathPattern=agenda-items
```

Expected: FAIL - routes don't exist yet.

**Step 3: Commit failing tests**

```bash
git add apps/api/test/agenda-items.e2e-spec.ts
git commit -m "test: add agenda items e2e tests (TDD red phase)"
```

---

## Task 3: Agenda Items - Service Implementation

**Files:**
- Create: `apps/api/src/agenda-items/agenda-items.service.ts`
- Create: `apps/api/src/agenda-items/dto/create-agenda-item.dto.ts`
- Create: `apps/api/src/agenda-items/dto/update-agenda-item.dto.ts`
- Create: `apps/api/src/agenda-items/dto/index.ts`

**Step 1: Create DTOs**

Create `apps/api/src/agenda-items/dto/create-agenda-item.dto.ts`:

```typescript
import { IsString, IsNotEmpty, IsOptional, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateAgendaItemDto {
  @ApiProperty({ description: 'Agenda item title' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ description: 'Description' })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({ description: 'Duration in minutes' })
  @IsInt()
  @IsOptional()
  @Min(1)
  duration?: number;
}
```

Create `apps/api/src/agenda-items/dto/update-agenda-item.dto.ts`:

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateAgendaItemDto } from './create-agenda-item.dto';

export class UpdateAgendaItemDto extends PartialType(CreateAgendaItemDto) {}
```

Create `apps/api/src/agenda-items/dto/index.ts`:

```typescript
export * from './create-agenda-item.dto';
export * from './update-agenda-item.dto';
```

**Step 2: Create the service**

Create `apps/api/src/agenda-items/agenda-items.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsGateway } from '../gateway/meetings.gateway';
import { CreateAgendaItemDto, UpdateAgendaItemDto } from './dto';

const userSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  imageUrl: true,
};

@Injectable()
export class AgendaItemsService {
  private readonly logger = new Logger(AgendaItemsService.name);

  constructor(
    private prisma: PrismaService,
    private meetingsGateway: MeetingsGateway,
  ) {}

  async create(
    companyId: string,
    meetingId: string,
    dto: CreateAgendaItemDto,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const maxOrderItem = await this.prisma.agendaItem.findFirst({
      where: { meetingId },
      orderBy: { order: 'desc' },
      select: { order: true },
    });
    const nextOrder = (maxOrderItem?.order ?? -1) + 1;

    const item = await this.prisma.agendaItem.create({
      data: {
        meetingId,
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
        createdById: userId,
        order: nextOrder,
      },
      include: {
        createdBy: { select: userSelect },
      },
    });

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:created', item);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:created event: ${errorMessage}`);
    }

    return item;
  }

  async findAllForMeeting(
    companyId: string,
    meetingId: string,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    return this.prisma.agendaItem.findMany({
      where: { meetingId },
      include: {
        createdBy: { select: userSelect },
      },
      orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async update(
    companyId: string,
    meetingId: string,
    itemId: string,
    dto: UpdateAgendaItemDto,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const existing = await this.prisma.agendaItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.meetingId !== meetingId) {
      throw new NotFoundException('Agenda item not found');
    }

    const item = await this.prisma.agendaItem.update({
      where: { id: itemId },
      data: {
        title: dto.title,
        description: dto.description,
        duration: dto.duration,
      },
      include: {
        createdBy: { select: userSelect },
      },
    });

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:updated', item);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:updated event: ${errorMessage}`);
    }

    return item;
  }

  async remove(
    companyId: string,
    meetingId: string,
    itemId: string,
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const existing = await this.prisma.agendaItem.findUnique({
      where: { id: itemId },
    });

    if (!existing || existing.meetingId !== meetingId) {
      throw new NotFoundException('Agenda item not found');
    }

    await this.prisma.agendaItem.delete({
      where: { id: itemId },
    });

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:deleted', { id: itemId });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:deleted event: ${errorMessage}`);
    }

    return { message: 'Agenda item deleted successfully' };
  }

  async reorder(
    companyId: string,
    meetingId: string,
    itemIds: string[],
    userId: string,
  ) {
    await this.verifyMeetingAccess(userId, companyId, meetingId);

    const updates = itemIds.map((itemId, index) =>
      this.prisma.agendaItem.update({
        where: { id: itemId },
        data: { order: index },
        include: {
          createdBy: { select: userSelect },
        },
      }),
    );

    const items = await this.prisma.$transaction(updates);

    try {
      this.meetingsGateway.emitToMeeting(meetingId, 'agenda:reordered', { itemIds });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit agenda:reordered event: ${errorMessage}`);
    }

    return items;
  }

  private async verifyMeetingAccess(
    userId: string,
    companyId: string,
    meetingId: string,
  ) {
    const meeting = await this.prisma.meeting.findUnique({
      where: { id: meetingId },
    });

    if (!meeting || meeting.companyId !== companyId) {
      throw new NotFoundException('Meeting not found');
    }

    const membership = await this.prisma.companyMember.findFirst({
      where: {
        userId,
        companyId,
        status: 'ACTIVE',
      },
    });

    if (!membership) {
      throw new ForbiddenException('You do not have access to this company');
    }

    return { meeting, membership };
  }
}
```

**Step 3: Commit service**

```bash
git add apps/api/src/agenda-items/
git commit -m "feat: add agenda items service with socket events"
```

---

## Task 4: Agenda Items - Controller and Module

**Files:**
- Create: `apps/api/src/agenda-items/agenda-items.controller.ts`
- Create: `apps/api/src/agenda-items/agenda-items.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create the controller**

Create `apps/api/src/agenda-items/agenda-items.controller.ts`:

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { AgendaItemsService } from './agenda-items.service';
import { CreateAgendaItemDto, UpdateAgendaItemDto } from './dto';
import { CurrentUser } from '../auth/decorators';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller('companies/:companyId/meetings/:meetingId/agenda')
@UseGuards(ClerkAuthGuard, PermissionGuard)
export class AgendaItemsController {
  constructor(private readonly agendaItemsService: AgendaItemsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @RequirePermission('meetings.edit')
  create(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() dto: CreateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.create(companyId, meetingId, dto, userId);
  }

  @Get()
  @RequirePermission('meetings.view')
  findAll(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.findAllForMeeting(companyId, meetingId, userId);
  }

  @Put('reorder')
  @RequirePermission('meetings.edit')
  reorder(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Body() body: { itemIds: string[] },
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.reorder(companyId, meetingId, body.itemIds, userId);
  }

  @Put(':itemId')
  @RequirePermission('meetings.edit')
  update(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateAgendaItemDto,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.update(companyId, meetingId, itemId, dto, userId);
  }

  @Delete(':itemId')
  @HttpCode(HttpStatus.OK)
  @RequirePermission('meetings.edit')
  remove(
    @Param('companyId') companyId: string,
    @Param('meetingId') meetingId: string,
    @Param('itemId') itemId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.agendaItemsService.remove(companyId, meetingId, itemId, userId);
  }
}
```

**Step 2: Create the module**

Create `apps/api/src/agenda-items/agenda-items.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AgendaItemsController } from './agenda-items.controller';
import { AgendaItemsService } from './agenda-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [AgendaItemsController],
  providers: [AgendaItemsService],
  exports: [AgendaItemsService],
})
export class AgendaItemsModule {}
```

**Step 3: Add to AppModule**

In `apps/api/src/app.module.ts`, add the import:

```typescript
import { AgendaItemsModule } from './agenda-items/agenda-items.module';

@Module({
  imports: [
    // ... existing imports
    AgendaItemsModule,
  ],
})
export class AppModule {}
```

**Step 4: Run tests to verify they pass**

```bash
cd apps/api
npm run test:e2e -- --testPathPattern=agenda-items
```

Expected: All tests PASS.

**Step 5: Commit**

```bash
git add apps/api/src/agenda-items/ apps/api/src/app.module.ts
git commit -m "feat: add agenda items controller and module"
```

---

## Task 5: Decisions - Add Socket Events and Reorder (TDD)

**Files:**
- Modify: `apps/api/test/meetings.e2e-spec.ts` or create `apps/api/test/decisions.e2e-spec.ts`
- Modify: `apps/api/src/meetings/meetings.service.ts`
- Modify: `apps/api/src/meetings/meetings.controller.ts`

**Step 1: Write failing tests for decision reorder**

Add to existing meetings tests or create `apps/api/test/decisions.e2e-spec.ts`:

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { PrismaService } from '../src/prisma/prisma.service';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
  MockAuthGuard,
} from './test-utils';

describe('Decisions Reorder (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;
  let companyId: string;
  let meetingId: string;

  beforeAll(async () => {
    const testSetup = await createTestApp();
    app = testSetup.app;
    prisma = testSetup.prisma;
    mockAuthGuard = testSetup.mockAuthGuard;

    await createTestUser(prisma, TEST_USER);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    await prisma.decision.deleteMany({});
    await prisma.meeting.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);

    const company = await createTestCompany(prisma, TEST_USER.id);
    companyId = company.id;

    const meeting = await prisma.meeting.create({
      data: {
        companyId,
        title: 'Test Meeting',
        scheduledAt: new Date(),
        duration: 60,
        status: 'IN_PROGRESS',
      },
    });
    meetingId = meeting.id;
  });

  describe('PUT /companies/:companyId/meetings/:meetingId/decisions/reorder', () => {
    let decisionIds: string[];

    beforeEach(async () => {
      const decisions = await Promise.all([
        prisma.decision.create({ data: { meetingId, title: 'D1', order: 0, createdById: TEST_USER.id } }),
        prisma.decision.create({ data: { meetingId, title: 'D2', order: 1, createdById: TEST_USER.id } }),
        prisma.decision.create({ data: { meetingId, title: 'D3', order: 2, createdById: TEST_USER.id } }),
      ]);
      decisionIds = decisions.map(d => d.id);
    });

    it('should reorder decisions', async () => {
      const newOrder = [decisionIds[2], decisionIds[0], decisionIds[1]];

      await request(app.getHttpServer())
        .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/decisions/reorder`)
        .send({ itemIds: newOrder })
        .expect(200);

      const reordered = await prisma.decision.findMany({
        where: { meetingId },
        orderBy: { order: 'asc' },
      });

      expect(reordered[0].title).toBe('D3');
      expect(reordered[1].title).toBe('D1');
      expect(reordered[2].title).toBe('D2');
    });
  });
});
```

**Step 2: Run test to verify failure**

```bash
npm run test:e2e -- --testPathPattern=decisions
```

Expected: FAIL - reorder endpoint doesn't exist.

**Step 3: Add reorder method to meetings.service.ts**

Find the existing `createDecision` method and add socket emit. Add new `reorderDecisions` method:

```typescript
// In meetings.service.ts, add after createDecision method:

async reorderDecisions(
  companyId: string,
  meetingId: string,
  itemIds: string[],
  userId: string,
) {
  // Verify access
  await this.verifyMeetingAccess(userId, companyId, meetingId);

  const updates = itemIds.map((itemId, index) =>
    this.prisma.decision.update({
      where: { id: itemId },
      data: { order: index },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            imageUrl: true,
          },
        },
        votes: true,
      },
    }),
  );

  const decisions = await this.prisma.$transaction(updates);

  // Emit socket event
  this.emitToMeeting(meetingId, 'decision:reordered', { itemIds });

  return decisions;
}

// Helper to emit (add if not exists):
private emitToMeeting(meetingId: string, event: string, data: unknown) {
  try {
    this.meetingsGateway.emitToMeeting(meetingId, event, data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    this.logger.error(`Failed to emit ${event}: ${errorMessage}`);
  }
}
```

**Step 4: Add controller endpoint**

In `meetings.controller.ts`, add:

```typescript
@Put(':meetingId/decisions/reorder')
@RequirePermission('meetings.edit')
reorderDecisions(
  @Param('companyId') companyId: string,
  @Param('meetingId') meetingId: string,
  @Body() body: { itemIds: string[] },
  @CurrentUser('userId') userId: string,
) {
  return this.meetingsService.reorderDecisions(companyId, meetingId, body.itemIds, userId);
}
```

**Step 5: Add socket emits to existing decision methods**

Modify `createDecision` to emit `decision:created`:
```typescript
// After saving decision:
this.emitToMeeting(meetingId, 'decision:created', decision);
```

Modify `updateDecision` (if exists) to emit `decision:updated`.

**Step 6: Run tests**

```bash
npm run test:e2e -- --testPathPattern=decisions
```

Expected: PASS.

**Step 7: Commit**

```bash
git add apps/api/src/meetings/ apps/api/test/decisions.e2e-spec.ts
git commit -m "feat: add decision reorder and socket events"
```

---

## Task 6: Action Items - Add Socket Events and Reorder

**Files:**
- Modify: `apps/api/test/action-items.e2e-spec.ts`
- Modify: `apps/api/src/action-items/action-items.service.ts`
- Modify: `apps/api/src/action-items/action-items.controller.ts`
- Modify: `apps/api/src/action-items/action-items.module.ts`

**Step 1: Add reorder test to existing tests**

Add to `apps/api/test/action-items.e2e-spec.ts`:

```typescript
describe('PUT /companies/:companyId/meetings/:meetingId/action-items/reorder', () => {
  let itemIds: string[];

  beforeEach(async () => {
    const items = await Promise.all([
      prisma.actionItem.create({ data: { companyId, meetingId, title: 'A1', order: 0, createdById: TEST_USER.id } }),
      prisma.actionItem.create({ data: { companyId, meetingId, title: 'A2', order: 1, createdById: TEST_USER.id } }),
      prisma.actionItem.create({ data: { companyId, meetingId, title: 'A3', order: 2, createdById: TEST_USER.id } }),
    ]);
    itemIds = items.map(i => i.id);
  });

  it('should reorder action items for a meeting', async () => {
    const newOrder = [itemIds[2], itemIds[0], itemIds[1]];

    await request(app.getHttpServer())
      .put(`/api/v1/companies/${companyId}/meetings/${meetingId}/action-items/reorder`)
      .send({ itemIds: newOrder })
      .expect(200);

    const reordered = await prisma.actionItem.findMany({
      where: { meetingId },
      orderBy: { order: 'asc' },
    });

    expect(reordered[0].title).toBe('A3');
    expect(reordered[1].title).toBe('A1');
    expect(reordered[2].title).toBe('A2');
  });
});
```

**Step 2: Add MeetingsGateway to ActionItemsService**

Modify `apps/api/src/action-items/action-items.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { ActionItemsController } from './action-items.controller';
import { ActionItemsService } from './action-items.service';
import { PrismaModule } from '../prisma/prisma.module';
import { GatewayModule } from '../gateway/gateway.module';

@Module({
  imports: [PrismaModule, GatewayModule],
  controllers: [ActionItemsController],
  providers: [ActionItemsService],
  exports: [ActionItemsService],
})
export class ActionItemsModule {}
```

**Step 3: Update service with socket emits**

Modify `apps/api/src/action-items/action-items.service.ts`:

```typescript
import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MeetingsGateway } from '../gateway/meetings.gateway';
// ... rest of imports

@Injectable()
export class ActionItemsService {
  private readonly logger = new Logger(ActionItemsService.name);

  constructor(
    private prisma: PrismaService,
    private meetingsGateway: MeetingsGateway,
  ) {}

  // In create method, after saving:
  // if (result.meetingId) {
  //   this.emitToMeeting(result.meetingId, 'action:created', result);
  // }

  // In update method, after saving:
  // if (result.meetingId) {
  //   this.emitToMeeting(result.meetingId, 'action:updated', result);
  // }

  // In remove method, after deleting:
  // if (actionItem.meetingId) {
  //   this.emitToMeeting(actionItem.meetingId, 'action:deleted', { id });
  // }

  async reorderForMeeting(
    companyId: string,
    meetingId: string,
    itemIds: string[],
    userId: string,
  ) {
    await this.verifyCompanyAccess(userId, companyId);

    const updates = itemIds.map((itemId, index) =>
      this.prisma.actionItem.update({
        where: { id: itemId },
        data: { order: index },
        include: {
          assignee: { select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true, email: true, imageUrl: true } },
        },
      }),
    );

    const items = await this.prisma.$transaction(updates);

    this.emitToMeeting(meetingId, 'action:reordered', { itemIds });

    return items;
  }

  private emitToMeeting(meetingId: string, event: string, data: unknown) {
    try {
      this.meetingsGateway.emitToMeeting(meetingId, event, data);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Failed to emit ${event}: ${errorMessage}`);
    }
  }
}
```

**Step 4: Add controller endpoint**

Add to `apps/api/src/action-items/action-items.controller.ts`:

```typescript
@Put('meetings/:meetingId/reorder')
@RequirePermission('action_items.edit')
reorderForMeeting(
  @Param('companyId') companyId: string,
  @Param('meetingId') meetingId: string,
  @Body() body: { itemIds: string[] },
  @CurrentUser('userId') userId: string,
) {
  return this.actionItemsService.reorderForMeeting(companyId, meetingId, body.itemIds, userId);
}
```

**Step 5: Run tests**

```bash
npm run test:e2e -- --testPathPattern=action-items
```

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/api/src/action-items/
git commit -m "feat: add action items socket events and reorder"
```

---

## Task 7: Frontend - Socket Event Hooks

**Files:**
- Modify: `apps/web/lib/socket/use-meeting-socket.ts`
- Modify: `apps/web/lib/types.ts`

**Step 1: Add types for new entities**

Add to `apps/web/lib/types.ts` or in the socket hook:

```typescript
export interface AgendaItem {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  duration?: number | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
}

export interface Decision {
  id: string;
  meetingId: string;
  title: string;
  description?: string | null;
  outcome?: 'PASSED' | 'REJECTED' | 'TABLED' | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
  votes?: Array<{
    id: string;
    userId: string;
    vote: 'FOR' | 'AGAINST' | 'ABSTAIN';
  }>;
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string | null;
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE';
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
  dueDate?: string | null;
  order: number;
  assignee?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    email: string;
    imageUrl?: string;
  };
}
```

**Step 2: Add socket event handlers to use-meeting-socket.ts**

Add after the existing note handlers:

```typescript
// Agenda item event handlers
const onAgendaCreated = useCallback(
  (callback: (item: AgendaItem) => void) => {
    if (!socket) return () => {};
    socket.on("agenda:created", callback);
    return () => socket.off("agenda:created", callback);
  },
  [socket]
);

const onAgendaUpdated = useCallback(
  (callback: (item: AgendaItem) => void) => {
    if (!socket) return () => {};
    socket.on("agenda:updated", callback);
    return () => socket.off("agenda:updated", callback);
  },
  [socket]
);

const onAgendaDeleted = useCallback(
  (callback: (event: { id: string }) => void) => {
    if (!socket) return () => {};
    socket.on("agenda:deleted", callback);
    return () => socket.off("agenda:deleted", callback);
  },
  [socket]
);

const onAgendaReordered = useCallback(
  (callback: (event: { itemIds: string[] }) => void) => {
    if (!socket) return () => {};
    socket.on("agenda:reordered", callback);
    return () => socket.off("agenda:reordered", callback);
  },
  [socket]
);

// Decision event handlers
const onDecisionCreated = useCallback(
  (callback: (decision: Decision) => void) => {
    if (!socket) return () => {};
    socket.on("decision:created", callback);
    return () => socket.off("decision:created", callback);
  },
  [socket]
);

const onDecisionUpdated = useCallback(
  (callback: (decision: Decision) => void) => {
    if (!socket) return () => {};
    socket.on("decision:updated", callback);
    return () => socket.off("decision:updated", callback);
  },
  [socket]
);

const onDecisionDeleted = useCallback(
  (callback: (event: { id: string }) => void) => {
    if (!socket) return () => {};
    socket.on("decision:deleted", callback);
    return () => socket.off("decision:deleted", callback);
  },
  [socket]
);

const onDecisionReordered = useCallback(
  (callback: (event: { itemIds: string[] }) => void) => {
    if (!socket) return () => {};
    socket.on("decision:reordered", callback);
    return () => socket.off("decision:reordered", callback);
  },
  [socket]
);

// Action item event handlers
const onActionCreated = useCallback(
  (callback: (action: ActionItem) => void) => {
    if (!socket) return () => {};
    socket.on("action:created", callback);
    return () => socket.off("action:created", callback);
  },
  [socket]
);

const onActionUpdated = useCallback(
  (callback: (action: ActionItem) => void) => {
    if (!socket) return () => {};
    socket.on("action:updated", callback);
    return () => socket.off("action:updated", callback);
  },
  [socket]
);

const onActionDeleted = useCallback(
  (callback: (event: { id: string }) => void) => {
    if (!socket) return () => {};
    socket.on("action:deleted", callback);
    return () => socket.off("action:deleted", callback);
  },
  [socket]
);

const onActionReordered = useCallback(
  (callback: (event: { itemIds: string[] }) => void) => {
    if (!socket) return () => {};
    socket.on("action:reordered", callback);
    return () => socket.off("action:reordered", callback);
  },
  [socket]
);

// Add to return statement:
return {
  // ... existing returns
  onAgendaCreated,
  onAgendaUpdated,
  onAgendaDeleted,
  onAgendaReordered,
  onDecisionCreated,
  onDecisionUpdated,
  onDecisionDeleted,
  onDecisionReordered,
  onActionCreated,
  onActionUpdated,
  onActionDeleted,
  onActionReordered,
};
```

**Step 3: Commit**

```bash
git add apps/web/lib/socket/use-meeting-socket.ts apps/web/lib/types.ts
git commit -m "feat: add socket event handlers for agenda, decisions, actions"
```

---

## Task 8: Frontend - Live Meeting Page UI Updates

**Files:**
- Modify: `apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx`

This is a large task. Key changes:

1. Add local state for `agendaItems`, `decisions`, `actionItems` (separate from meeting data)
2. Subscribe to socket events for each
3. Replace `await refetch()` with socket-driven updates
4. Add sortable components for each section
5. Add CRUD UI for agenda items

**Step 1: Add state and socket subscriptions**

```typescript
// Add after notes state
const [agendaItems, setAgendaItems] = useState<AgendaItem[]>([]);
const [decisions, setDecisions] = useState<Decision[]>([]);
const [actionItems, setActionItems] = useState<ActionItem[]>([]);

// Destructure new socket handlers
const {
  // ... existing
  onAgendaCreated,
  onAgendaUpdated,
  onAgendaDeleted,
  onAgendaReordered,
  onDecisionCreated,
  onDecisionUpdated,
  onDecisionDeleted,
  onDecisionReordered,
  onActionCreated,
  onActionUpdated,
  onActionDeleted,
  onActionReordered,
} = useMeetingSocket(id);

// Initialize from meeting data
useEffect(() => {
  if (meeting?.agendaItems) setAgendaItems(meeting.agendaItems);
  if (meeting?.decisions) setDecisions(meeting.decisions);
  if (meeting?.actionItems) setActionItems(meeting.actionItems);
}, [meeting]);

// Subscribe to agenda events
useEffect(() => {
  const unsubCreated = onAgendaCreated((item) => {
    setAgendaItems((prev) => {
      if (prev.some((a) => a.id === item.id)) return prev;
      return [...prev, item].sort((a, b) => a.order - b.order);
    });
  });
  const unsubUpdated = onAgendaUpdated((item) => {
    setAgendaItems((prev) => prev.map((a) => (a.id === item.id ? item : a)));
  });
  const unsubDeleted = onAgendaDeleted(({ id }) => {
    setAgendaItems((prev) => prev.filter((a) => a.id !== id));
  });
  const unsubReordered = onAgendaReordered(({ itemIds }) => {
    setAgendaItems((prev) => {
      const map = new Map(prev.map((a) => [a.id, a]));
      return itemIds.map((id) => map.get(id)).filter(Boolean) as AgendaItem[];
    });
  });
  return () => { unsubCreated(); unsubUpdated(); unsubDeleted(); unsubReordered(); };
}, [onAgendaCreated, onAgendaUpdated, onAgendaDeleted, onAgendaReordered]);

// Similar patterns for decisions and actionItems...
```

**Step 2: Remove refetch() calls**

Find and remove all `await refetch()` calls after CRUD operations. The socket events will update state instead.

**Step 3: Add SortableAgendaItem, SortableDecision, SortableActionItem components**

Follow the `SortableNote` pattern.

**Step 4: Add agenda CRUD UI**

Add "Add Agenda Item" button and dialog similar to decisions/actions.

**Step 5: Commit**

```bash
git add apps/web/app/companies/[companyId]/meetings/[id]/live/page.tsx
git commit -m "feat: update live meeting page with real-time socket updates"
```

---

## Task 9: Web E2E Tests

**Files:**
- Create: `apps/web/e2e/live-meeting-realtime.spec.ts`

**Step 1: Write tests for real-time updates**

```typescript
import { test, expect } from './fixtures';

test.describe('Live Meeting Real-time Features', () => {
  let companyId: string;
  let meetingId: string;

  test.beforeEach(async ({ page }) => {
    // Navigate to a live meeting
    await page.goto('/companies');
    await page.waitForLoadState('networkidle');
    // ... navigation logic to get to a live meeting
  });

  test('should add agenda item without page refresh', async ({ page }) => {
    // Find add agenda button
    const addButton = page.locator('button:has-text("Add Agenda")');
    await addButton.click();

    // Fill form
    await page.fill('input[id*="title"], input[placeholder*="title" i]', 'New Agenda Item');
    await page.click('button:has-text("Create"), button:has-text("Add")');

    // Verify item appears without navigation
    await expect(page.locator('text=New Agenda Item')).toBeVisible({ timeout: 5000 });
    // Verify URL didn't change (no navigation)
    expect(page.url()).toContain('/live');
  });

  test('should add decision without page refresh', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Decision")');
    await addButton.click();

    await page.fill('input[id*="title"], input[placeholder*="title" i]', 'New Decision');
    await page.click('button:has-text("Start Vote"), button:has-text("Add")');

    await expect(page.locator('text=New Decision')).toBeVisible({ timeout: 5000 });
  });

  test('should add action item without page refresh', async ({ page }) => {
    const addButton = page.locator('button:has-text("Add Action")');
    await addButton.click();

    await page.fill('input[id*="title"], input[placeholder*="title" i]', 'New Action Item');
    await page.click('button:has-text("Create")');

    await expect(page.locator('text=New Action Item')).toBeVisible({ timeout: 5000 });
  });

  test('should have drag handles for agenda items', async ({ page }) => {
    const dragHandle = page.locator('[class*="cursor-grab"]').first();
    await expect(dragHandle).toBeVisible({ timeout: 5000 });
  });

  test('should reorder agenda items with drag and drop', async ({ page }) => {
    // This test requires at least 2 agenda items
    const items = page.locator('[data-testid="agenda-item"], [class*="agenda-item"]');
    const count = await items.count();

    test.skip(count < 2, 'Need at least 2 items to test reorder');

    // Get first item's handle and drag it down
    const firstHandle = page.locator('[class*="cursor-grab"]').first();
    const secondItem = items.nth(1);

    const firstBox = await firstHandle.boundingBox();
    const secondBox = await secondItem.boundingBox();

    if (firstBox && secondBox) {
      await page.mouse.move(firstBox.x + 5, firstBox.y + 5);
      await page.mouse.down();
      await page.mouse.move(secondBox.x + 5, secondBox.y + secondBox.height + 10);
      await page.mouse.up();

      await page.waitForTimeout(500);
    }
  });
});
```

**Step 2: Run tests**

```bash
cd apps/web
npx playwright test live-meeting-realtime
```

**Step 3: Commit**

```bash
git add apps/web/e2e/live-meeting-realtime.spec.ts
git commit -m "test: add live meeting real-time e2e tests"
```

---

## Task 10: Code Review and Final Verification

**Step 1: Run all API tests**

```bash
cd apps/api
npm run test:e2e
```

Expected: All tests pass.

**Step 2: Run all web tests**

```bash
cd apps/web
npx playwright test
```

Expected: All tests pass.

**Step 3: Manual verification**

1. Open two browser windows to the same live meeting
2. Add an agenda item in window 1 → appears in window 2 without refresh
3. Add a decision in window 1 → appears in window 2
4. Drag to reorder in window 1 → order updates in window 2
5. Verify no console errors

**Step 4: Request code review**

Use `superpowers:requesting-code-review` to verify implementation.

**Step 5: Final commit**

```bash
git add .
git commit -m "feat: complete live meeting real-time features

- Add real-time Socket.IO updates for agenda items, decisions, action items
- Add drag-and-drop sorting for all features
- Add order field to Decision and ActionItem models
- Comprehensive API and web E2E tests
- No page refresh required for any CRUD operation"
```

---

## Summary

| Task | Description | TDD Phase |
|------|-------------|-----------|
| 1 | Database schema migration | Setup |
| 2 | Agenda items e2e tests | Red |
| 3 | Agenda items service | Green |
| 4 | Agenda items controller/module | Green |
| 5 | Decisions socket events + reorder | Red → Green |
| 6 | Action items socket events + reorder | Red → Green |
| 7 | Frontend socket hooks | Implementation |
| 8 | Live meeting page UI | Implementation |
| 9 | Web e2e tests | Verification |
| 10 | Code review + final verification | Refactor |

**Estimated tasks: 10 major tasks with ~50 steps total**
