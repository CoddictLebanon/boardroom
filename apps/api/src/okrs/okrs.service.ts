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
export interface KeyResultWithProgress {
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

export interface ObjectiveWithProgress {
  id: string;
  periodId: string;
  title: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
  keyResults: KeyResultWithProgress[];
  progress: number;
}

export interface OkrPeriodWithProgress {
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
