import { Controller, Post, Body, Param, UseGuards, UsePipes, ValidationPipe, NotFoundException } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateResolutionDto } from './dto/generate-resolution.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { PermissionGuard, RequirePermission } from '../permissions';

@Controller('ai')
@UseGuards(ClerkAuthGuard, PermissionGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AiController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  @Post('companies/:companyId/generate-resolution')
  @RequirePermission('resolutions.create')
  async generateResolution(
    @Param('companyId') companyId: string,
    @Body() dto: GenerateResolutionDto,
  ) {
    // Get company name for the prompt
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    if (!company) {
      throw new NotFoundException(`Company with id ${companyId} not found`);
    }

    return this.aiService.generateResolution(company.name, dto);
  }
}
