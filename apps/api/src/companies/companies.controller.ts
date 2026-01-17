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
  Logger,
} from '@nestjs/common';
import { CompaniesService } from './companies.service';
import {
  CreateCompanyDto,
  UpdateCompanyDto,
  AddMemberDto,
  UpdateMemberDto,
} from './dto';
import { CurrentUser } from '../auth/decorators';

@Controller('companies')
export class CompaniesController {
  private readonly logger = new Logger(CompaniesController.name);

  constructor(private readonly companiesService: CompaniesService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createCompanyDto: CreateCompanyDto,
  ) {
    this.logger.log(`POST /companies - userId: ${userId}, name: ${createCompanyDto?.name}`);
    return this.companiesService.create(userId, createCompanyDto);
  }

  @Get()
  async findUserCompanies(@CurrentUser('userId') userId: string) {
    this.logger.log(`GET /companies - userId: ${userId}`);
    return this.companiesService.findUserCompanies(userId);
  }

  @Get(':id')
  async findOne(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.companiesService.findOne(companyId, userId);
  }

  @Get(':id/dashboard')
  async getDashboardStats(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.companiesService.getDashboardStats(companyId, userId);
  }

  @Put(':id')
  async update(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(companyId, userId, updateCompanyDto);
  }

  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.companiesService.addMember(companyId, userId, addMemberDto);
  }

  @Put(':id/members/:memberId')
  async updateMember(
    @Param('id') companyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
    @Body() updateMemberDto: UpdateMemberDto,
  ) {
    return this.companiesService.updateMember(
      companyId,
      memberId,
      userId,
      updateMemberDto,
    );
  }

  @Delete(':id/members/:memberId')
  @HttpCode(HttpStatus.OK)
  async removeMember(
    @Param('id') companyId: string,
    @Param('memberId') memberId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.companiesService.removeMember(companyId, memberId, userId);
  }
}
