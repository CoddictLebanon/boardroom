# OKR System Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a company-wide OKR tracking system with flexible periods, objectives, key results, and progress scoring.

**Architecture:** NestJS API with Prisma ORM following existing patterns (controller → service → prisma). React frontend with shadcn/ui components. Role-based permissions using existing permission system.

**Tech Stack:** NestJS, Prisma, PostgreSQL, React, Next.js, shadcn/ui, TailwindCSS

---

## Task 1: Database Schema - Add OKR Models

**Files:**
- Modify: `apps/api/prisma/schema.prisma`

**Step 1: Add currency field to Company and OKR models**

Add to `schema.prisma` after the existing Company model fields:

```prisma
// In Company model, add after fiscalYearStart:
currency String @default("USD")

// Add relation at end of Company model:
okrPeriods OkrPeriod[]
```

Add new models at the end of the file (before any closing comments):

```prisma
// ==========================================
// OKRs (Objectives & Key Results)
// ==========================================

model OkrPeriod {
  id        String          @id @default(cuid())
  companyId String
  name      String          // e.g., "2025 Q2 Product OKRs"
  startDate DateTime
  endDate   DateTime
  status    OkrPeriodStatus @default(OPEN)
  createdAt DateTime        @default(now())
  updatedAt DateTime        @updatedAt

  company    Company     @relation(fields: [companyId], references: [id], onDelete: Cascade)
  objectives Objective[]

  @@index([companyId])
  @@index([companyId, status])
}

enum OkrPeriodStatus {
  OPEN
  CLOSED
}

model Objective {
  id        String   @id @default(cuid())
  periodId  String
  title     String
  order     Int      @default(0)
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  period     OkrPeriod   @relation(fields: [periodId], references: [id], onDelete: Cascade)
  keyResults KeyResult[]

  @@index([periodId])
}

model KeyResult {
  id           String     @id @default(cuid())
  objectiveId  String
  title        String
  metricType   MetricType @default(NUMERIC)
  startValue   Decimal    @db.Decimal(15, 2)
  targetValue  Decimal    @db.Decimal(15, 2)
  currentValue Decimal    @db.Decimal(15, 2)
  inverse      Boolean    @default(false)
  comment      String?
  order        Int        @default(0)
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  objective Objective @relation(fields: [objectiveId], references: [id], onDelete: Cascade)

  @@index([objectiveId])
}

enum MetricType {
  NUMERIC
  PERCENTAGE
  CURRENCY
  BOOLEAN
}
```

**Step 2: Generate and run migration**

Run: `cd apps/api && npx prisma migrate dev --name add_okr_system`

Expected: Migration created and applied successfully

**Step 3: Commit**

```bash
git add apps/api/prisma/schema.prisma apps/api/prisma/migrations/
git commit -m "feat(db): add OKR system schema with periods, objectives, key results"
```

---

## Task 2: Seed OKR Permissions

**Files:**
- Modify: `apps/api/prisma/seeds/permissions.ts`

**Step 1: Add OKR permissions to PERMISSIONS array**

Add after the existing permissions (before the closing bracket):

```typescript
  // OKRs
  { code: 'okrs.view', area: 'okrs', action: 'view', description: 'View OKR periods, objectives, and key results' },
  { code: 'okrs.create', area: 'okrs', action: 'create', description: 'Create OKR periods and objectives' },
  { code: 'okrs.edit', area: 'okrs', action: 'edit', description: 'Edit objectives and update key result values' },
  { code: 'okrs.delete', area: 'okrs', action: 'delete', description: 'Delete OKR periods, objectives, and key results' },
  { code: 'okrs.close', area: 'okrs', action: 'close', description: 'Close and reopen OKR periods' },
```

**Step 2: Run seed to add permissions**

Run: `cd apps/api && npx prisma db seed`

Expected: Permissions seeded successfully

**Step 3: Commit**

```bash
git add apps/api/prisma/seeds/permissions.ts
git commit -m "feat(permissions): add OKR permission seeds"
```

---

## Task 3: Create OKR DTOs

**Files:**
- Create: `apps/api/src/okrs/dto/create-okr-period.dto.ts`
- Create: `apps/api/src/okrs/dto/update-okr-period.dto.ts`
- Create: `apps/api/src/okrs/dto/create-objective.dto.ts`
- Create: `apps/api/src/okrs/dto/update-objective.dto.ts`
- Create: `apps/api/src/okrs/dto/create-key-result.dto.ts`
- Create: `apps/api/src/okrs/dto/update-key-result.dto.ts`
- Create: `apps/api/src/okrs/dto/index.ts`

**Step 1: Create directory**

Run: `mkdir -p apps/api/src/okrs/dto`

**Step 2: Create create-okr-period.dto.ts**

```typescript
import { IsString, IsNotEmpty, IsDateString, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOkrPeriodDto {
  @ApiProperty({ description: 'Period name', maxLength: 255, example: '2025 Q2 Product OKRs' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({ description: 'Start date in ISO format', example: '2025-04-01T00:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  startDate!: string;

  @ApiProperty({ description: 'End date in ISO format', example: '2025-06-30T23:59:59Z' })
  @IsDateString()
  @IsNotEmpty()
  endDate!: string;
}
```

**Step 3: Create update-okr-period.dto.ts**

```typescript
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOkrPeriodDto {
  @ApiPropertyOptional({ description: 'Period name', maxLength: 255 })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional({ description: 'Start date in ISO format' })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ description: 'End date in ISO format' })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
```

**Step 4: Create create-objective.dto.ts**

```typescript
import { IsString, IsNotEmpty, IsInt, IsOptional, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateObjectiveDto {
  @ApiProperty({ description: 'Objective title', maxLength: 500, example: 'Mitigate PPC Risk' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  title!: string;

  @ApiPropertyOptional({ description: 'Display order', example: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
```

**Step 5: Create update-objective.dto.ts**

```typescript
import { IsString, IsOptional, IsInt, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateObjectiveDto {
  @ApiPropertyOptional({ description: 'Objective title', maxLength: 500 })
  @IsString()
  @IsOptional()
  @MaxLength(500)
  title?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
```

**Step 6: Create create-key-result.dto.ts**

```typescript
import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsOptional, IsInt, IsNumber, MaxLength, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '@prisma/client';

export class CreateKeyResultDto {
  @ApiProperty({ description: 'Key result title', maxLength: 1000, example: 'Acquire 40,000 Customers from PPC' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  title!: string;

  @ApiPropertyOptional({ description: 'Metric type', enum: MetricType, default: 'NUMERIC' })
  @IsEnum(MetricType)
  @IsOptional()
  metricType?: MetricType;

  @ApiProperty({ description: 'Start value (baseline)', example: 30000 })
  @IsNumber()
  @IsNotEmpty()
  startValue!: number;

  @ApiProperty({ description: 'Target value (goal)', example: 40000 })
  @IsNumber()
  @IsNotEmpty()
  targetValue!: number;

  @ApiPropertyOptional({ description: 'Current value', example: 30000 })
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Inverse metric (lower is better)', default: false })
  @IsBoolean()
  @IsOptional()
  inverse?: boolean;

  @ApiPropertyOptional({ description: 'Comment', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
```

**Step 7: Create update-key-result.dto.ts**

```typescript
import { IsString, IsEnum, IsBoolean, IsOptional, IsInt, IsNumber, MaxLength, Min } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { MetricType } from '@prisma/client';

export class UpdateKeyResultDto {
  @ApiPropertyOptional({ description: 'Key result title', maxLength: 1000 })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  title?: string;

  @ApiPropertyOptional({ description: 'Metric type', enum: MetricType })
  @IsEnum(MetricType)
  @IsOptional()
  metricType?: MetricType;

  @ApiPropertyOptional({ description: 'Start value (baseline)' })
  @IsNumber()
  @IsOptional()
  startValue?: number;

  @ApiPropertyOptional({ description: 'Target value (goal)' })
  @IsNumber()
  @IsOptional()
  targetValue?: number;

  @ApiPropertyOptional({ description: 'Current value' })
  @IsNumber()
  @IsOptional()
  currentValue?: number;

  @ApiPropertyOptional({ description: 'Inverse metric (lower is better)' })
  @IsBoolean()
  @IsOptional()
  inverse?: boolean;

  @ApiPropertyOptional({ description: 'Comment', maxLength: 2000 })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  comment?: string;

  @ApiPropertyOptional({ description: 'Display order' })
  @IsInt()
  @Min(0)
  @IsOptional()
  order?: number;
}
```

**Step 8: Create index.ts**

```typescript
export * from './create-okr-period.dto';
export * from './update-okr-period.dto';
export * from './create-objective.dto';
export * from './update-objective.dto';
export * from './create-key-result.dto';
export * from './update-key-result.dto';
```

**Step 9: Commit**

```bash
git add apps/api/src/okrs/
git commit -m "feat(okrs): add DTOs for OKR periods, objectives, and key results"
```

---

## Task 4: Create OKRs Service

**Files:**
- Create: `apps/api/src/okrs/okrs.service.ts`

**Step 1: Create service with all CRUD operations and progress calculation**

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateOkrPeriodDto,
  UpdateOkrPeriodDto,
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateKeyResultDto,
  UpdateKeyResultDto,
} from './dto';
import { OkrPeriodStatus, MetricType, Prisma } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// Types for progress calculation
interface KeyResultWithProgress {
  id: string;
  objectiveId: string;
  title: string;
  metricType: MetricType;
  startValue: Decimal;
  targetValue: Decimal;
  currentValue: Decimal;
  inverse: boolean;
  comment: string | null;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  progress: number;
}

interface ObjectiveWithProgress {
  id: string;
  periodId: string;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  keyResults: KeyResultWithProgress[];
  progress: number;
}

interface OkrPeriodWithProgress {
  id: string;
  companyId: string;
  name: string;
  startDate: Date;
  endDate: Date;
  status: OkrPeriodStatus;
  createdAt: Date;
  updatedAt: Date;
  objectives: ObjectiveWithProgress[];
  score: number;
}

@Injectable()
export class OkrsService {
  constructor(private prisma: PrismaService) {}

  // ==========================================
  // Progress Calculation
  // ==========================================

  private calculateKeyResultProgress(kr: {
    metricType: MetricType;
    startValue: Decimal;
    targetValue: Decimal;
    currentValue: Decimal;
    inverse: boolean;
  }): number {
    const start = Number(kr.startValue);
    const target = Number(kr.targetValue);
    const current = Number(kr.currentValue);

    // Boolean type: 0% or 100%
    if (kr.metricType === MetricType.BOOLEAN) {
      return current >= 1 ? 100 : 0;
    }

    const range = target - start;
    if (range === 0) return current >= target ? 100 : 0;

    let progress: number;
    if (kr.inverse) {
      // Lower is better
      progress = ((start - current) / (start - target)) * 100;
    } else {
      // Higher is better
      progress = ((current - start) / (target - start)) * 100;
    }

    // Clamp between 0 and 100
    return Math.min(100, Math.max(0, progress));
  }

  private calculateObjectiveProgress(keyResults: { progress: number }[]): number {
    if (keyResults.length === 0) return 0;
    const sum = keyResults.reduce((acc, kr) => acc + kr.progress, 0);
    return sum / keyResults.length;
  }

  private calculatePeriodScore(objectives: { progress: number }[]): number {
    if (objectives.length === 0) return 0;
    const sum = objectives.reduce((acc, obj) => acc + obj.progress, 0);
    return sum / objectives.length;
  }

  private addProgressToKeyResult(kr: any): KeyResultWithProgress {
    return {
      ...kr,
      progress: this.calculateKeyResultProgress(kr),
    };
  }

  private addProgressToObjective(obj: any): ObjectiveWithProgress {
    const keyResultsWithProgress = obj.keyResults.map((kr: any) =>
      this.addProgressToKeyResult(kr),
    );
    return {
      ...obj,
      keyResults: keyResultsWithProgress,
      progress: this.calculateObjectiveProgress(keyResultsWithProgress),
    };
  }

  private addProgressToPeriod(period: any): OkrPeriodWithProgress {
    const objectivesWithProgress = period.objectives.map((obj: any) =>
      this.addProgressToObjective(obj),
    );
    return {
      ...period,
      objectives: objectivesWithProgress,
      score: this.calculatePeriodScore(objectivesWithProgress),
    };
  }

  // ==========================================
  // OKR Periods
  // ==========================================

  async createPeriod(companyId: string, dto: CreateOkrPeriodDto): Promise<OkrPeriodWithProgress> {
    const period = await this.prisma.okrPeriod.create({
      data: {
        companyId,
        name: dto.name,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
      },
      include: {
        objectives: {
          include: {
            keyResults: true,
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.addProgressToPeriod(period);
  }

  async findAllPeriods(companyId: string): Promise<OkrPeriodWithProgress[]> {
    const periods = await this.prisma.okrPeriod.findMany({
      where: { companyId },
      include: {
        objectives: {
          include: {
            keyResults: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
      orderBy: { startDate: 'desc' },
    });

    return periods.map((period) => this.addProgressToPeriod(period));
  }

  async findOnePeriod(id: string): Promise<OkrPeriodWithProgress> {
    const period = await this.prisma.okrPeriod.findUnique({
      where: { id },
      include: {
        objectives: {
          include: {
            keyResults: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!period) {
      throw new NotFoundException(`OKR Period with ID ${id} not found`);
    }

    return this.addProgressToPeriod(period);
  }

  async updatePeriod(id: string, dto: UpdateOkrPeriodDto): Promise<OkrPeriodWithProgress> {
    const period = await this.findOnePeriod(id);

    if (period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot update a closed OKR period');
    }

    const updated = await this.prisma.okrPeriod.update({
      where: { id },
      data: {
        name: dto.name,
        startDate: dto.startDate ? new Date(dto.startDate) : undefined,
        endDate: dto.endDate ? new Date(dto.endDate) : undefined,
      },
      include: {
        objectives: {
          include: {
            keyResults: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.addProgressToPeriod(updated);
  }

  async closePeriod(id: string): Promise<OkrPeriodWithProgress> {
    await this.findOnePeriod(id);

    const updated = await this.prisma.okrPeriod.update({
      where: { id },
      data: { status: OkrPeriodStatus.CLOSED },
      include: {
        objectives: {
          include: {
            keyResults: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.addProgressToPeriod(updated);
  }

  async reopenPeriod(id: string): Promise<OkrPeriodWithProgress> {
    await this.findOnePeriod(id);

    const updated = await this.prisma.okrPeriod.update({
      where: { id },
      data: { status: OkrPeriodStatus.OPEN },
      include: {
        objectives: {
          include: {
            keyResults: {
              orderBy: { order: 'asc' },
            },
          },
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.addProgressToPeriod(updated);
  }

  async deletePeriod(id: string): Promise<{ message: string }> {
    await this.findOnePeriod(id);

    await this.prisma.okrPeriod.delete({
      where: { id },
    });

    return { message: 'OKR Period deleted successfully' };
  }

  // ==========================================
  // Objectives
  // ==========================================

  async createObjective(periodId: string, dto: CreateObjectiveDto): Promise<ObjectiveWithProgress> {
    const period = await this.findOnePeriod(periodId);

    if (period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot add objectives to a closed OKR period');
    }

    const objective = await this.prisma.objective.create({
      data: {
        periodId,
        title: dto.title,
        order: dto.order ?? 0,
      },
      include: {
        keyResults: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.addProgressToObjective(objective);
  }

  async updateObjective(id: string, dto: UpdateObjectiveDto): Promise<ObjectiveWithProgress> {
    const objective = await this.prisma.objective.findUnique({
      where: { id },
      include: {
        period: true,
        keyResults: {
          orderBy: { order: 'asc' },
        },
      },
    });

    if (!objective) {
      throw new NotFoundException(`Objective with ID ${id} not found`);
    }

    if (objective.period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot update objectives in a closed OKR period');
    }

    const updated = await this.prisma.objective.update({
      where: { id },
      data: {
        title: dto.title,
        order: dto.order,
      },
      include: {
        keyResults: {
          orderBy: { order: 'asc' },
        },
      },
    });

    return this.addProgressToObjective(updated);
  }

  async deleteObjective(id: string): Promise<{ message: string }> {
    const objective = await this.prisma.objective.findUnique({
      where: { id },
      include: { period: true },
    });

    if (!objective) {
      throw new NotFoundException(`Objective with ID ${id} not found`);
    }

    if (objective.period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot delete objectives from a closed OKR period');
    }

    await this.prisma.objective.delete({
      where: { id },
    });

    return { message: 'Objective deleted successfully' };
  }

  // ==========================================
  // Key Results
  // ==========================================

  async createKeyResult(objectiveId: string, dto: CreateKeyResultDto): Promise<KeyResultWithProgress> {
    const objective = await this.prisma.objective.findUnique({
      where: { id: objectiveId },
      include: { period: true },
    });

    if (!objective) {
      throw new NotFoundException(`Objective with ID ${objectiveId} not found`);
    }

    if (objective.period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot add key results to a closed OKR period');
    }

    const keyResult = await this.prisma.keyResult.create({
      data: {
        objectiveId,
        title: dto.title,
        metricType: dto.metricType ?? MetricType.NUMERIC,
        startValue: dto.startValue,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue ?? dto.startValue,
        inverse: dto.inverse ?? false,
        comment: dto.comment,
        order: dto.order ?? 0,
      },
    });

    return this.addProgressToKeyResult(keyResult);
  }

  async updateKeyResult(id: string, dto: UpdateKeyResultDto): Promise<KeyResultWithProgress> {
    const keyResult = await this.prisma.keyResult.findUnique({
      where: { id },
      include: {
        objective: {
          include: { period: true },
        },
      },
    });

    if (!keyResult) {
      throw new NotFoundException(`Key Result with ID ${id} not found`);
    }

    if (keyResult.objective.period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot update key results in a closed OKR period');
    }

    const updated = await this.prisma.keyResult.update({
      where: { id },
      data: {
        title: dto.title,
        metricType: dto.metricType,
        startValue: dto.startValue,
        targetValue: dto.targetValue,
        currentValue: dto.currentValue,
        inverse: dto.inverse,
        comment: dto.comment,
        order: dto.order,
      },
    });

    return this.addProgressToKeyResult(updated);
  }

  async deleteKeyResult(id: string): Promise<{ message: string }> {
    const keyResult = await this.prisma.keyResult.findUnique({
      where: { id },
      include: {
        objective: {
          include: { period: true },
        },
      },
    });

    if (!keyResult) {
      throw new NotFoundException(`Key Result with ID ${id} not found`);
    }

    if (keyResult.objective.period.status === OkrPeriodStatus.CLOSED) {
      throw new ForbiddenException('Cannot delete key results from a closed OKR period');
    }

    await this.prisma.keyResult.delete({
      where: { id },
    });

    return { message: 'Key Result deleted successfully' };
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/okrs/okrs.service.ts
git commit -m "feat(okrs): add OKRs service with CRUD and progress calculation"
```

---

## Task 5: Create OKRs Controller

**Files:**
- Create: `apps/api/src/okrs/okrs.controller.ts`

**Step 1: Create controller with all endpoints**

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  ValidationPipe,
  UsePipes,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { OkrsService } from './okrs.service';
import {
  CreateOkrPeriodDto,
  UpdateOkrPeriodDto,
  CreateObjectiveDto,
  UpdateObjectiveDto,
  CreateKeyResultDto,
  UpdateKeyResultDto,
} from './dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PermissionGuard, RequirePermission } from '../permissions';

@ApiTags('okrs')
@ApiBearerAuth()
@Controller()
@UseGuards(ClerkAuthGuard, PermissionGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class OkrsController {
  constructor(private readonly okrsService: OkrsService) {}

  // ==========================================
  // OKR Periods
  // ==========================================

  @Post('companies/:companyId/okr-periods')
  @RequirePermission('okrs.create')
  @ApiOperation({ summary: 'Create a new OKR period' })
  createPeriod(
    @Param('companyId') companyId: string,
    @Body() dto: CreateOkrPeriodDto,
  ) {
    return this.okrsService.createPeriod(companyId, dto);
  }

  @Get('companies/:companyId/okr-periods')
  @RequirePermission('okrs.view')
  @ApiOperation({ summary: 'Get all OKR periods for a company' })
  findAllPeriods(@Param('companyId') companyId: string) {
    return this.okrsService.findAllPeriods(companyId);
  }

  @Get('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.view')
  @ApiOperation({ summary: 'Get a specific OKR period' })
  findOnePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.findOnePeriod(id);
  }

  @Patch('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.edit')
  @ApiOperation({ summary: 'Update an OKR period' })
  updatePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateOkrPeriodDto,
  ) {
    return this.okrsService.updatePeriod(id, dto);
  }

  @Post('companies/:companyId/okr-periods/:id/close')
  @RequirePermission('okrs.close')
  @ApiOperation({ summary: 'Close an OKR period' })
  closePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.closePeriod(id);
  }

  @Post('companies/:companyId/okr-periods/:id/reopen')
  @RequirePermission('okrs.close')
  @ApiOperation({ summary: 'Reopen a closed OKR period' })
  reopenPeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.reopenPeriod(id);
  }

  @Delete('companies/:companyId/okr-periods/:id')
  @RequirePermission('okrs.delete')
  @ApiOperation({ summary: 'Delete an OKR period' })
  deletePeriod(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ) {
    return this.okrsService.deletePeriod(id);
  }

  // ==========================================
  // Objectives
  // ==========================================

  @Post('okr-periods/:periodId/objectives')
  @RequirePermission('okrs.create')
  @ApiOperation({ summary: 'Create a new objective' })
  createObjective(
    @Param('periodId') periodId: string,
    @Body() dto: CreateObjectiveDto,
  ) {
    return this.okrsService.createObjective(periodId, dto);
  }

  @Patch('objectives/:id')
  @RequirePermission('okrs.edit')
  @ApiOperation({ summary: 'Update an objective' })
  updateObjective(
    @Param('id') id: string,
    @Body() dto: UpdateObjectiveDto,
  ) {
    return this.okrsService.updateObjective(id, dto);
  }

  @Delete('objectives/:id')
  @RequirePermission('okrs.delete')
  @ApiOperation({ summary: 'Delete an objective' })
  deleteObjective(@Param('id') id: string) {
    return this.okrsService.deleteObjective(id);
  }

  // ==========================================
  // Key Results
  // ==========================================

  @Post('objectives/:objectiveId/key-results')
  @RequirePermission('okrs.create')
  @ApiOperation({ summary: 'Create a new key result' })
  createKeyResult(
    @Param('objectiveId') objectiveId: string,
    @Body() dto: CreateKeyResultDto,
  ) {
    return this.okrsService.createKeyResult(objectiveId, dto);
  }

  @Patch('key-results/:id')
  @RequirePermission('okrs.edit')
  @ApiOperation({ summary: 'Update a key result' })
  updateKeyResult(
    @Param('id') id: string,
    @Body() dto: UpdateKeyResultDto,
  ) {
    return this.okrsService.updateKeyResult(id, dto);
  }

  @Delete('key-results/:id')
  @RequirePermission('okrs.delete')
  @ApiOperation({ summary: 'Delete a key result' })
  deleteKeyResult(@Param('id') id: string) {
    return this.okrsService.deleteKeyResult(id);
  }
}
```

**Step 2: Commit**

```bash
git add apps/api/src/okrs/okrs.controller.ts
git commit -m "feat(okrs): add OKRs controller with all endpoints"
```

---

## Task 6: Create OKRs Module and Register

**Files:**
- Create: `apps/api/src/okrs/okrs.module.ts`
- Modify: `apps/api/src/app.module.ts`

**Step 1: Create okrs.module.ts**

```typescript
import { Module } from '@nestjs/common';
import { OkrsService } from './okrs.service';
import { OkrsController } from './okrs.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OkrsController],
  providers: [OkrsService],
  exports: [OkrsService],
})
export class OkrsModule {}
```

**Step 2: Add OkrsModule to app.module.ts imports**

In `apps/api/src/app.module.ts`, add the import and register the module:

```typescript
// Add import at top
import { OkrsModule } from './okrs/okrs.module';

// Add to imports array
OkrsModule,
```

**Step 3: Commit**

```bash
git add apps/api/src/okrs/okrs.module.ts apps/api/src/app.module.ts
git commit -m "feat(okrs): create OKRs module and register in app"
```

---

## Task 7: Write E2E Tests for OKRs API

**Files:**
- Create: `apps/api/test/okrs.e2e-spec.ts`
- Modify: `apps/api/test/test-utils.ts` (add OkrsModule)

**Step 1: Add OkrsModule to test-utils.ts**

Add import and module to `createTestApp`:

```typescript
// Add import
import { OkrsModule } from '../src/okrs/okrs.module';

// Add to imports array in createTestApp
OkrsModule,
```

**Step 2: Create comprehensive E2E test file**

```typescript
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import {
  createTestApp,
  createTestUser,
  createTestCompany,
  TEST_USER,
  MockAuthGuard,
} from './test-utils';
import { PrismaService } from '../src/prisma/prisma.service';

describe('OKRs API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let mockAuthGuard: MockAuthGuard;
  let companyId: string;

  beforeAll(async () => {
    const testApp = await createTestApp();
    app = testApp.app;
    prisma = testApp.prisma;
    mockAuthGuard = testApp.mockAuthGuard;

    await createTestUser(prisma, TEST_USER);
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(async () => {
    // Clean data before each test
    await prisma.keyResult.deleteMany({});
    await prisma.objective.deleteMany({});
    await prisma.okrPeriod.deleteMany({});
    await prisma.company.deleteMany({});

    mockAuthGuard.setMockUserId(TEST_USER.id);

    const company = await createTestCompany(prisma, TEST_USER.id, 'Test Company');
    companyId = company.id;
  });

  // ==========================================
  // OKR Periods
  // ==========================================

  describe('POST /api/v1/companies/:companyId/okr-periods', () => {
    it('should create a new OKR period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods`)
        .send({
          name: '2025 Q2 OKRs',
          startDate: '2025-04-01T00:00:00Z',
          endDate: '2025-06-30T23:59:59Z',
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe('2025 Q2 OKRs');
      expect(response.body.status).toBe('OPEN');
      expect(response.body.score).toBe(0);
      expect(response.body.objectives).toEqual([]);
    });

    it('should reject period with missing fields', async () => {
      await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods`)
        .send({
          name: 'Missing dates',
        })
        .expect(400);
    });
  });

  describe('GET /api/v1/companies/:companyId/okr-periods', () => {
    beforeEach(async () => {
      await prisma.okrPeriod.create({
        data: {
          companyId,
          name: '2025 Q1 OKRs',
          startDate: new Date('2025-01-01'),
          endDate: new Date('2025-03-31'),
        },
      });
      await prisma.okrPeriod.create({
        data: {
          companyId,
          name: '2025 Q2 OKRs',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
    });

    it('should return all OKR periods for the company', async () => {
      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods`)
        .expect(200);

      expect(response.body).toHaveLength(2);
      // Should be ordered by startDate desc
      expect(response.body[0].name).toBe('2025 Q2 OKRs');
    });
  });

  describe('PATCH /api/v1/companies/:companyId/okr-periods/:id', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Original Name',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
    });

    it('should update period name', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}`)
        .send({ name: 'Updated Name' })
        .expect(200);

      expect(response.body.name).toBe('Updated Name');
    });

    it('should not update a closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .patch(`/api/v1/companies/${companyId}/okr-periods/${periodId}`)
        .send({ name: 'Trying to update' })
        .expect(403);
    });
  });

  describe('POST /api/v1/companies/:companyId/okr-periods/:id/close', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Period to close',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
    });

    it('should close an open period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/close`)
        .expect(201);

      expect(response.body.status).toBe('CLOSED');
    });
  });

  describe('POST /api/v1/companies/:companyId/okr-periods/:id/reopen', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Closed period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
          status: 'CLOSED',
        },
      });
      periodId = period.id;
    });

    it('should reopen a closed period', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/companies/${companyId}/okr-periods/${periodId}/reopen`)
        .expect(201);

      expect(response.body.status).toBe('OPEN');
    });
  });

  describe('DELETE /api/v1/companies/:companyId/okr-periods/:id', () => {
    it('should delete an OKR period', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'To delete',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      const deleted = await prisma.okrPeriod.findUnique({
        where: { id: period.id },
      });
      expect(deleted).toBeNull();
    });
  });

  // ==========================================
  // Objectives
  // ==========================================

  describe('POST /api/v1/okr-periods/:periodId/objectives', () => {
    let periodId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      periodId = period.id;
    });

    it('should create a new objective', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/okr-periods/${periodId}/objectives`)
        .send({
          title: 'Mitigate PPC Risk',
          order: 0,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Mitigate PPC Risk');
      expect(response.body.progress).toBe(0);
    });

    it('should not create objective in closed period', async () => {
      await prisma.okrPeriod.update({
        where: { id: periodId },
        data: { status: 'CLOSED' },
      });

      await request(app.getHttpServer())
        .post(`/api/v1/okr-periods/${periodId}/objectives`)
        .send({ title: 'New objective' })
        .expect(403);
    });
  });

  describe('PATCH /api/v1/objectives/:id', () => {
    let objectiveId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Original Title',
        },
      });
      objectiveId = objective.id;
    });

    it('should update objective title', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/objectives/${objectiveId}`)
        .send({ title: 'Updated Title' })
        .expect(200);

      expect(response.body.title).toBe('Updated Title');
    });
  });

  describe('DELETE /api/v1/objectives/:id', () => {
    it('should delete an objective', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'To delete',
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/objectives/${objective.id}`)
        .expect(200);

      const deleted = await prisma.objective.findUnique({
        where: { id: objective.id },
      });
      expect(deleted).toBeNull();
    });
  });

  // ==========================================
  // Key Results
  // ==========================================

  describe('POST /api/v1/objectives/:objectiveId/key-results', () => {
    let objectiveId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      objectiveId = objective.id;
    });

    it('should create a new key result', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Acquire 40,000 Customers',
          metricType: 'NUMERIC',
          startValue: 30000,
          targetValue: 40000,
          currentValue: 30000,
        })
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe('Acquire 40,000 Customers');
      expect(response.body.progress).toBe(0);
    });

    it('should calculate progress correctly', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Generate Revenue',
          startValue: 50000,
          targetValue: 75000,
          currentValue: 71000,
        })
        .expect(201);

      // (71000 - 50000) / (75000 - 50000) * 100 = 84%
      expect(response.body.progress).toBe(84);
    });

    it('should handle inverse metrics', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Reduce Churn',
          startValue: 10,
          targetValue: 5,
          currentValue: 7,
          inverse: true,
        })
        .expect(201);

      // (10 - 7) / (10 - 5) * 100 = 60%
      expect(response.body.progress).toBe(60);
    });

    it('should cap progress at 100%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Exceeded Target',
          startValue: 0,
          targetValue: 100,
          currentValue: 150,
        })
        .expect(201);

      expect(response.body.progress).toBe(100);
    });

    it('should not go below 0%', async () => {
      const response = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Negative Progress',
          startValue: 100,
          targetValue: 200,
          currentValue: 50,
        })
        .expect(201);

      expect(response.body.progress).toBe(0);
    });

    it('should handle boolean metrics', async () => {
      const responseNotDone = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Launch Feature',
          metricType: 'BOOLEAN',
          startValue: 0,
          targetValue: 1,
          currentValue: 0,
        })
        .expect(201);

      expect(responseNotDone.body.progress).toBe(0);

      const responseDone = await request(app.getHttpServer())
        .post(`/api/v1/objectives/${objectiveId}/key-results`)
        .send({
          title: 'Another Feature',
          metricType: 'BOOLEAN',
          startValue: 0,
          targetValue: 1,
          currentValue: 1,
        })
        .expect(201);

      expect(responseDone.body.progress).toBe(100);
    });
  });

  describe('PATCH /api/v1/key-results/:id', () => {
    let keyResultId: string;

    beforeEach(async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'Original KR',
          startValue: 0,
          targetValue: 100,
          currentValue: 50,
        },
      });
      keyResultId = keyResult.id;
    });

    it('should update current value', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/key-results/${keyResultId}`)
        .send({ currentValue: 75 })
        .expect(200);

      expect(Number(response.body.currentValue)).toBe(75);
      expect(response.body.progress).toBe(75);
    });

    it('should update comment', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/api/v1/key-results/${keyResultId}`)
        .send({ comment: 'On track!' })
        .expect(200);

      expect(response.body.comment).toBe('On track!');
    });
  });

  describe('DELETE /api/v1/key-results/:id', () => {
    it('should delete a key result', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });
      const keyResult = await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'To delete',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      await request(app.getHttpServer())
        .delete(`/api/v1/key-results/${keyResult.id}`)
        .expect(200);

      const deleted = await prisma.keyResult.findUnique({
        where: { id: keyResult.id },
      });
      expect(deleted).toBeNull();
    });
  });

  // ==========================================
  // Progress Aggregation
  // ==========================================

  describe('Progress Aggregation', () => {
    it('should calculate objective progress as average of key results', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });
      const objective = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Test Objective',
        },
      });

      // Create KR with 0% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 1',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      // Create KR with 100% progress
      await prisma.keyResult.create({
        data: {
          objectiveId: objective.id,
          title: 'KR 2',
          startValue: 0,
          targetValue: 100,
          currentValue: 100,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      // Average: (0 + 100) / 2 = 50%
      expect(response.body.objectives[0].progress).toBe(50);
    });

    it('should calculate period score as average of objectives', async () => {
      const period = await prisma.okrPeriod.create({
        data: {
          companyId,
          name: 'Test Period',
          startDate: new Date('2025-04-01'),
          endDate: new Date('2025-06-30'),
        },
      });

      // Objective 1 with 100% progress
      const obj1 = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Objective 1',
        },
      });
      await prisma.keyResult.create({
        data: {
          objectiveId: obj1.id,
          title: 'KR 1',
          startValue: 0,
          targetValue: 100,
          currentValue: 100,
        },
      });

      // Objective 2 with 0% progress
      const obj2 = await prisma.objective.create({
        data: {
          periodId: period.id,
          title: 'Objective 2',
        },
      });
      await prisma.keyResult.create({
        data: {
          objectiveId: obj2.id,
          title: 'KR 2',
          startValue: 0,
          targetValue: 100,
          currentValue: 0,
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/api/v1/companies/${companyId}/okr-periods/${period.id}`)
        .expect(200);

      // Average: (100 + 0) / 2 = 50%
      expect(response.body.score).toBe(50);
    });
  });
});
```

**Step 3: Run tests to verify**

Run: `cd apps/api && npm run test:e2e -- --testPathPattern=okrs`

Expected: All tests pass

**Step 4: Commit**

```bash
git add apps/api/test/okrs.e2e-spec.ts apps/api/test/test-utils.ts
git commit -m "test(okrs): add comprehensive E2E tests for OKRs API"
```

---

## Task 8: Add OKRs to Sidebar Navigation

**Files:**
- Modify: `apps/web/components/sidebar.tsx`

**Step 1: Add Target icon import and OKRs navigation item**

Add to imports:
```typescript
import { Target } from "lucide-react";
```

Add to `allNavigation` array (after Financials):
```typescript
{ name: "OKRs", href: `${basePath}/okrs`, icon: Target, permission: "okrs.view" },
```

**Step 2: Commit**

```bash
git add apps/web/components/sidebar.tsx
git commit -m "feat(web): add OKRs to sidebar navigation"
```

---

## Task 9: Create OKRs Page - API Client and Types

**Files:**
- Modify: `apps/web/lib/types.ts` (add OKR types)
- Create: `apps/web/lib/api/okrs.ts`

**Step 1: Add OKR types to types.ts**

```typescript
// OKR Types
export type OkrPeriodStatus = 'OPEN' | 'CLOSED';
export type MetricType = 'NUMERIC' | 'PERCENTAGE' | 'CURRENCY' | 'BOOLEAN';

export interface KeyResult {
  id: string;
  objectiveId: string;
  title: string;
  metricType: MetricType;
  startValue: number;
  targetValue: number;
  currentValue: number;
  inverse: boolean;
  comment: string | null;
  order: number;
  createdAt: string;
  updatedAt: string;
  progress: number;
}

export interface Objective {
  id: string;
  periodId: string;
  title: string;
  order: number;
  createdAt: string;
  updatedAt: string;
  keyResults: KeyResult[];
  progress: number;
}

export interface OkrPeriod {
  id: string;
  companyId: string;
  name: string;
  startDate: string;
  endDate: string;
  status: OkrPeriodStatus;
  createdAt: string;
  updatedAt: string;
  objectives: Objective[];
  score: number;
}
```

**Step 2: Create API client**

Create `apps/web/lib/api/okrs.ts`:

```typescript
import { OkrPeriod, Objective, KeyResult, MetricType } from '../types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/api/v1';

async function fetchWithAuth(url: string, options: RequestInit = {}) {
  const response = await fetch(url, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || 'Request failed');
  }

  return response.json();
}

// OKR Periods
export async function getOkrPeriods(companyId: string, token: string): Promise<OkrPeriod[]> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getOkrPeriod(companyId: string, periodId: string, token: string): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function createOkrPeriod(
  companyId: string,
  data: { name: string; startDate: string; endDate: string },
  token: string
): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function updateOkrPeriod(
  companyId: string,
  periodId: string,
  data: { name?: string; startDate?: string; endDate?: string },
  token: string
): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function closeOkrPeriod(companyId: string, periodId: string, token: string): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function reopenOkrPeriod(companyId: string, periodId: string, token: string): Promise<OkrPeriod> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}/reopen`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteOkrPeriod(companyId: string, periodId: string, token: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/companies/${companyId}/okr-periods/${periodId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Objectives
export async function createObjective(
  periodId: string,
  data: { title: string; order?: number },
  token: string
): Promise<Objective> {
  return fetchWithAuth(`${API_URL}/okr-periods/${periodId}/objectives`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function updateObjective(
  objectiveId: string,
  data: { title?: string; order?: number },
  token: string
): Promise<Objective> {
  return fetchWithAuth(`${API_URL}/objectives/${objectiveId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteObjective(objectiveId: string, token: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/objectives/${objectiveId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}

// Key Results
export async function createKeyResult(
  objectiveId: string,
  data: {
    title: string;
    metricType?: MetricType;
    startValue: number;
    targetValue: number;
    currentValue?: number;
    inverse?: boolean;
    comment?: string;
    order?: number;
  },
  token: string
): Promise<KeyResult> {
  return fetchWithAuth(`${API_URL}/objectives/${objectiveId}/key-results`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function updateKeyResult(
  keyResultId: string,
  data: {
    title?: string;
    metricType?: MetricType;
    startValue?: number;
    targetValue?: number;
    currentValue?: number;
    inverse?: boolean;
    comment?: string;
    order?: number;
  },
  token: string
): Promise<KeyResult> {
  return fetchWithAuth(`${API_URL}/key-results/${keyResultId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
}

export async function deleteKeyResult(keyResultId: string, token: string): Promise<void> {
  return fetchWithAuth(`${API_URL}/key-results/${keyResultId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
}
```

**Step 3: Commit**

```bash
git add apps/web/lib/types.ts apps/web/lib/api/okrs.ts
git commit -m "feat(web): add OKR types and API client"
```

---

## Task 10: Create OKRs Page Component

**Files:**
- Create: `apps/web/app/companies/[companyId]/okrs/page.tsx`

**Step 1: Create main OKRs page**

```typescript
"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Pencil,
  Trash2,
  Lock,
  Unlock,
} from "lucide-react";
import { usePermission } from "@/lib/permissions";
import { OkrPeriod, Objective, KeyResult, MetricType } from "@/lib/types";
import * as okrsApi from "@/lib/api/okrs";
import { format, differenceInDays, isPast } from "date-fns";

export default function OkrsPage() {
  const params = useParams();
  const companyId = params.companyId as string;
  const { getToken } = useAuth();

  const canView = usePermission("okrs.view");
  const canCreate = usePermission("okrs.create");
  const canEdit = usePermission("okrs.edit");
  const canDelete = usePermission("okrs.delete");
  const canClose = usePermission("okrs.close");

  const [periods, setPeriods] = useState<OkrPeriod[]>([]);
  const [selectedPeriodId, setSelectedPeriodId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [expandedObjectives, setExpandedObjectives] = useState<Set<string>>(new Set());

  // Dialog states
  const [periodDialogOpen, setPeriodDialogOpen] = useState(false);
  const [objectiveDialogOpen, setObjectiveDialogOpen] = useState(false);
  const [keyResultDialogOpen, setKeyResultDialogOpen] = useState(false);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);

  // Form states
  const [periodForm, setPeriodForm] = useState({ name: "", startDate: "", endDate: "" });
  const [objectiveForm, setObjectiveForm] = useState({ title: "" });
  const [keyResultForm, setKeyResultForm] = useState({
    title: "",
    metricType: "NUMERIC" as MetricType,
    startValue: 0,
    targetValue: 0,
    currentValue: 0,
    inverse: false,
  });

  const selectedPeriod = periods.find((p) => p.id === selectedPeriodId);

  useEffect(() => {
    loadPeriods();
  }, [companyId]);

  async function loadPeriods() {
    try {
      const token = await getToken();
      if (!token) return;

      const data = await okrsApi.getOkrPeriods(companyId, token);
      setPeriods(data);

      if (data.length > 0 && !selectedPeriodId) {
        setSelectedPeriodId(data[0].id);
        // Expand all objectives by default
        setExpandedObjectives(new Set(data[0].objectives.map((o) => o.id)));
      }
    } catch (error) {
      console.error("Failed to load OKR periods:", error);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreatePeriod() {
    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.createOkrPeriod(companyId, periodForm, token);
      setPeriodDialogOpen(false);
      setPeriodForm({ name: "", startDate: "", endDate: "" });
      loadPeriods();
    } catch (error) {
      console.error("Failed to create period:", error);
    }
  }

  async function handleCreateObjective() {
    if (!selectedPeriodId) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.createObjective(selectedPeriodId, objectiveForm, token);
      setObjectiveDialogOpen(false);
      setObjectiveForm({ title: "" });
      loadPeriods();
    } catch (error) {
      console.error("Failed to create objective:", error);
    }
  }

  async function handleCreateKeyResult() {
    if (!editingObjectiveId) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.createKeyResult(editingObjectiveId, keyResultForm, token);
      setKeyResultDialogOpen(false);
      setKeyResultForm({
        title: "",
        metricType: "NUMERIC",
        startValue: 0,
        targetValue: 0,
        currentValue: 0,
        inverse: false,
      });
      setEditingObjectiveId(null);
      loadPeriods();
    } catch (error) {
      console.error("Failed to create key result:", error);
    }
  }

  async function handleUpdateKeyResultValue(krId: string, currentValue: number) {
    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.updateKeyResult(krId, { currentValue }, token);
      loadPeriods();
    } catch (error) {
      console.error("Failed to update key result:", error);
    }
  }

  async function handleUpdateKeyResultComment(krId: string, comment: string) {
    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.updateKeyResult(krId, { comment }, token);
      loadPeriods();
    } catch (error) {
      console.error("Failed to update comment:", error);
    }
  }

  async function handleDeleteObjective(objectiveId: string) {
    if (!confirm("Are you sure you want to delete this objective?")) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.deleteObjective(objectiveId, token);
      loadPeriods();
    } catch (error) {
      console.error("Failed to delete objective:", error);
    }
  }

  async function handleDeleteKeyResult(krId: string) {
    if (!confirm("Are you sure you want to delete this key result?")) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.deleteKeyResult(krId, token);
      loadPeriods();
    } catch (error) {
      console.error("Failed to delete key result:", error);
    }
  }

  async function handleClosePeriod() {
    if (!selectedPeriodId) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.closeOkrPeriod(companyId, selectedPeriodId, token);
      loadPeriods();
    } catch (error) {
      console.error("Failed to close period:", error);
    }
  }

  async function handleReopenPeriod() {
    if (!selectedPeriodId) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.reopenOkrPeriod(companyId, selectedPeriodId, token);
      loadPeriods();
    } catch (error) {
      console.error("Failed to reopen period:", error);
    }
  }

  async function handleDeletePeriod() {
    if (!selectedPeriodId) return;
    if (!confirm("Are you sure you want to delete this OKR period?")) return;

    try {
      const token = await getToken();
      if (!token) return;

      await okrsApi.deleteOkrPeriod(companyId, selectedPeriodId, token);
      setSelectedPeriodId(null);
      loadPeriods();
    } catch (error) {
      console.error("Failed to delete period:", error);
    }
  }

  function toggleObjective(objectiveId: string) {
    const newExpanded = new Set(expandedObjectives);
    if (newExpanded.has(objectiveId)) {
      newExpanded.delete(objectiveId);
    } else {
      newExpanded.add(objectiveId);
    }
    setExpandedObjectives(newExpanded);
  }

  function formatMetricValue(value: number, metricType: MetricType): string {
    switch (metricType) {
      case "PERCENTAGE":
        return `${value}%`;
      case "CURRENCY":
        return new Intl.NumberFormat("en-US", {
          style: "currency",
          currency: "USD",
          minimumFractionDigits: 0,
        }).format(value);
      case "BOOLEAN":
        return value >= 1 ? "Yes" : "No";
      default:
        return new Intl.NumberFormat("en-US").format(value);
    }
  }

  function getDaysRemaining(endDate: string): string {
    const end = new Date(endDate);
    if (isPast(end)) {
      return "Ended";
    }
    const days = differenceInDays(end, new Date());
    return `${days} days remaining`;
  }

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  if (!canView) {
    return <div className="p-6">You don't have permission to view OKRs.</div>;
  }

  const isPeriodClosed = selectedPeriod?.status === "CLOSED";
  const canEditPeriod = canEdit && !isPeriodClosed;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">OKRs</h1>
          <p className="text-muted-foreground">
            Track objectives and key results
          </p>
        </div>
        {canCreate && (
          <Dialog open={periodDialogOpen} onOpenChange={setPeriodDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                New Period
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create OKR Period</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    value={periodForm.name}
                    onChange={(e) =>
                      setPeriodForm({ ...periodForm, name: e.target.value })
                    }
                    placeholder="2025 Q2 OKRs"
                  />
                </div>
                <div>
                  <Label htmlFor="startDate">Start Date</Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={periodForm.startDate}
                    onChange={(e) =>
                      setPeriodForm({ ...periodForm, startDate: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="endDate">End Date</Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={periodForm.endDate}
                    onChange={(e) =>
                      setPeriodForm({ ...periodForm, endDate: e.target.value })
                    }
                  />
                </div>
                <Button onClick={handleCreatePeriod} className="w-full">
                  Create Period
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {periods.length === 0 ? (
        <Card>
          <CardContent className="py-10 text-center">
            <p className="text-muted-foreground">No OKR periods yet.</p>
            {canCreate && (
              <p className="text-sm text-muted-foreground mt-2">
                Create your first OKR period to get started.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Period Selector and Header */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <Select
                    value={selectedPeriodId || ""}
                    onValueChange={(value) => {
                      setSelectedPeriodId(value);
                      const period = periods.find((p) => p.id === value);
                      if (period) {
                        setExpandedObjectives(
                          new Set(period.objectives.map((o) => o.id))
                        );
                      }
                    }}
                  >
                    <SelectTrigger className="w-[250px]">
                      <SelectValue placeholder="Select period" />
                    </SelectTrigger>
                    <SelectContent>
                      {periods.map((period) => (
                        <SelectItem key={period.id} value={period.id}>
                          {period.name}
                          {period.status === "CLOSED" && " (Closed)"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {selectedPeriod && (
                    <Badge
                      variant={isPeriodClosed ? "secondary" : "default"}
                    >
                      {isPeriodClosed ? "Closed" : "Open"}
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {canClose && selectedPeriod && (
                    <>
                      {isPeriodClosed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleReopenPeriod}
                        >
                          <Unlock className="mr-2 h-4 w-4" />
                          Reopen
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleClosePeriod}
                        >
                          <Lock className="mr-2 h-4 w-4" />
                          Close Period
                        </Button>
                      )}
                    </>
                  )}
                  {canDelete && selectedPeriod && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleDeletePeriod}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>

            {selectedPeriod && (
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(selectedPeriod.startDate), "MMM d, yyyy")} -{" "}
                    {format(new Date(selectedPeriod.endDate), "MMM d, yyyy")}
                    <span className="ml-4">
                      {getDaysRemaining(selectedPeriod.endDate)}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium">Score:</span>
                  <Progress
                    value={selectedPeriod.score}
                    className="flex-1 max-w-md"
                  />
                  <span className="text-lg font-bold">
                    {selectedPeriod.score.toFixed(2)}%
                  </span>
                </div>
              </CardContent>
            )}
          </Card>

          {/* Objectives and Key Results */}
          {selectedPeriod && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Objectives</CardTitle>
                {canCreate && !isPeriodClosed && (
                  <Dialog
                    open={objectiveDialogOpen}
                    onOpenChange={setObjectiveDialogOpen}
                  >
                    <DialogTrigger asChild>
                      <Button size="sm">
                        <Plus className="mr-2 h-4 w-4" />
                        Add Objective
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create Objective</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="objTitle">Title</Label>
                          <Input
                            id="objTitle"
                            value={objectiveForm.title}
                            onChange={(e) =>
                              setObjectiveForm({ title: e.target.value })
                            }
                            placeholder="Mitigate PPC Risk"
                          />
                        </div>
                        <Button onClick={handleCreateObjective} className="w-full">
                          Create Objective
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                )}
              </CardHeader>
              <CardContent>
                {selectedPeriod.objectives.length === 0 ? (
                  <p className="text-center text-muted-foreground py-4">
                    No objectives yet. Add your first objective to get started.
                  </p>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[300px]">Objective / Key Result</TableHead>
                        <TableHead>Metric</TableHead>
                        <TableHead className="text-right">Start</TableHead>
                        <TableHead className="text-right">Target</TableHead>
                        <TableHead className="text-right">Current</TableHead>
                        <TableHead className="text-right">Progress</TableHead>
                        <TableHead>Last Update</TableHead>
                        <TableHead>Comment</TableHead>
                        <TableHead className="w-[100px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedPeriod.objectives.map((objective) => (
                        <>
                          {/* Objective Row */}
                          <TableRow
                            key={objective.id}
                            className="bg-muted/50 font-medium cursor-pointer"
                            onClick={() => toggleObjective(objective.id)}
                          >
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {expandedObjectives.has(objective.id) ? (
                                  <ChevronDown className="h-4 w-4" />
                                ) : (
                                  <ChevronRight className="h-4 w-4" />
                                )}
                                {objective.title}
                              </div>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Progress
                                  value={objective.progress}
                                  className="w-20"
                                />
                                <span>{objective.progress.toFixed(2)}%</span>
                              </div>
                            </TableCell>
                            <TableCell></TableCell>
                            <TableCell></TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                {canCreate && !isPeriodClosed && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingObjectiveId(objective.id);
                                      setKeyResultDialogOpen(true);
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                )}
                                {canDelete && !isPeriodClosed && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteObjective(objective.id);
                                    }}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>

                          {/* Key Result Rows */}
                          {expandedObjectives.has(objective.id) &&
                            objective.keyResults.map((kr) => (
                              <TableRow key={kr.id}>
                                <TableCell className="pl-10">
                                  {kr.title}
                                  {kr.inverse && (
                                    <Badge variant="outline" className="ml-2 text-xs">
                                      Lower is better
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="secondary">{kr.metricType}</Badge>
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetricValue(kr.startValue, kr.metricType)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {formatMetricValue(kr.targetValue, kr.metricType)}
                                </TableCell>
                                <TableCell className="text-right">
                                  {canEditPeriod ? (
                                    <Input
                                      type="number"
                                      className="w-24 text-right"
                                      value={kr.currentValue}
                                      onChange={(e) => {
                                        const value = parseFloat(e.target.value);
                                        if (!isNaN(value)) {
                                          handleUpdateKeyResultValue(kr.id, value);
                                        }
                                      }}
                                    />
                                  ) : (
                                    formatMetricValue(kr.currentValue, kr.metricType)
                                  )}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-2">
                                    <Progress
                                      value={kr.progress}
                                      className="w-16"
                                    />
                                    <span className="text-sm">
                                      {kr.progress.toFixed(2)}%
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-muted-foreground">
                                  {format(new Date(kr.updatedAt), "MMM d, HH:mm")}
                                </TableCell>
                                <TableCell>
                                  {canEditPeriod ? (
                                    <Input
                                      className="w-32"
                                      placeholder="Add comment..."
                                      value={kr.comment || ""}
                                      onChange={(e) =>
                                        handleUpdateKeyResultComment(kr.id, e.target.value)
                                      }
                                    />
                                  ) : (
                                    <span className="text-sm">{kr.comment || "-"}</span>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {canDelete && !isPeriodClosed && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => handleDeleteKeyResult(kr.id)}
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TableCell>
                              </TableRow>
                            ))}
                        </>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          )}

          {/* Key Result Dialog */}
          <Dialog open={keyResultDialogOpen} onOpenChange={setKeyResultDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create Key Result</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="krTitle">Title</Label>
                  <Input
                    id="krTitle"
                    value={keyResultForm.title}
                    onChange={(e) =>
                      setKeyResultForm({ ...keyResultForm, title: e.target.value })
                    }
                    placeholder="Acquire 40,000 Customers"
                  />
                </div>
                <div>
                  <Label htmlFor="metricType">Metric Type</Label>
                  <Select
                    value={keyResultForm.metricType}
                    onValueChange={(value: MetricType) =>
                      setKeyResultForm({ ...keyResultForm, metricType: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NUMERIC">Numeric</SelectItem>
                      <SelectItem value="PERCENTAGE">Percentage</SelectItem>
                      <SelectItem value="CURRENCY">Currency</SelectItem>
                      <SelectItem value="BOOLEAN">Boolean</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="startValue">Start Value</Label>
                    <Input
                      id="startValue"
                      type="number"
                      value={keyResultForm.startValue}
                      onChange={(e) =>
                        setKeyResultForm({
                          ...keyResultForm,
                          startValue: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="targetValue">Target Value</Label>
                    <Input
                      id="targetValue"
                      type="number"
                      value={keyResultForm.targetValue}
                      onChange={(e) =>
                        setKeyResultForm({
                          ...keyResultForm,
                          targetValue: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                  <div>
                    <Label htmlFor="currentValue">Current Value</Label>
                    <Input
                      id="currentValue"
                      type="number"
                      value={keyResultForm.currentValue}
                      onChange={(e) =>
                        setKeyResultForm({
                          ...keyResultForm,
                          currentValue: parseFloat(e.target.value) || 0,
                        })
                      }
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="inverse"
                    checked={keyResultForm.inverse}
                    onChange={(e) =>
                      setKeyResultForm({ ...keyResultForm, inverse: e.target.checked })
                    }
                  />
                  <Label htmlFor="inverse">Lower is better (inverse metric)</Label>
                </div>
                <Button onClick={handleCreateKeyResult} className="w-full">
                  Create Key Result
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  );
}
```

**Step 2: Commit**

```bash
git add apps/web/app/companies/[companyId]/okrs/
git commit -m "feat(web): add OKRs page with full CRUD and inline editing"
```

---

## Task 11: Run All Tests and Verify

**Step 1: Run API E2E tests**

Run: `cd apps/api && npm run test:e2e -- --testPathPattern=okrs`

Expected: All OKR tests pass

**Step 2: Run API build**

Run: `cd apps/api && npm run build`

Expected: Build succeeds with no errors

**Step 3: Run web build**

Run: `cd apps/web && npm run build`

Expected: Build succeeds with no errors

**Step 4: Final commit**

```bash
git add -A
git commit -m "feat(okrs): complete OKR system implementation

- Database schema with OkrPeriod, Objective, KeyResult models
- Permission seeds for okrs.view, create, edit, delete, close
- Full CRUD API with progress calculation
- Comprehensive E2E tests
- Frontend page with inline editing and SPA experience"
```

---

## Summary

**Tasks:**
1. Database Schema - Add OKR models to Prisma
2. Seed OKR Permissions - Add 5 new permissions
3. Create OKR DTOs - Validation for all endpoints
4. Create OKRs Service - CRUD + progress calculation
5. Create OKRs Controller - All REST endpoints
6. Create OKRs Module - Register in app
7. Write E2E Tests - Comprehensive API tests
8. Add to Sidebar - Navigation item
9. Create API Client - Frontend API helpers
10. Create OKRs Page - Full React component
11. Run Tests and Verify - Ensure everything works

**Total estimated tasks:** 11 major tasks with TDD approach

