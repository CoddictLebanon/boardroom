import { Controller, Post, Body, Param, UseGuards, UsePipes, ValidationPipe } from '@nestjs/common';
import { AiService } from './ai.service';
import { GenerateResolutionDto } from './dto/generate-resolution.dto';
import { ClerkAuthGuard } from '../auth/guards/clerk-auth.guard';
import { PrismaService } from '../prisma/prisma.service';

@Controller('api/v1/ai')
@UseGuards(ClerkAuthGuard)
@UsePipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }))
export class AiController {
  constructor(
    private aiService: AiService,
    private prisma: PrismaService,
  ) {}

  @Post('companies/:companyId/generate-resolution')
  async generateResolution(
    @Param('companyId') companyId: string,
    @Body() dto: GenerateResolutionDto,
  ) {
    // Get company name for the prompt
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { name: true },
    });

    return this.aiService.generateResolution(company?.name || 'Company', dto);
  }
}
