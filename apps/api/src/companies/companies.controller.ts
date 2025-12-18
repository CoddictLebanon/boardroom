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

  /**
   * Create a new company
   * POST /companies
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @CurrentUser('userId') userId: string,
    @Body() createCompanyDto: CreateCompanyDto,
  ) {
    this.logger.log(`POST /companies - userId: ${userId}, name: ${createCompanyDto?.name}`);
    return this.companiesService.create(userId, createCompanyDto);
  }

  /**
   * Get all companies for the current user
   * GET /companies
   */
  @Get()
  async findUserCompanies(@CurrentUser('userId') userId: string) {
    this.logger.log(`GET /companies - userId: ${userId}`);
    return this.companiesService.findUserCompanies(userId);
  }

  /**
   * Get a specific company by ID
   * GET /companies/:id
   */
  @Get(':id')
  async findOne(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
  ) {
    return this.companiesService.findOne(companyId, userId);
  }

  /**
   * Update a company
   * PUT /companies/:id
   */
  @Put(':id')
  async update(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() updateCompanyDto: UpdateCompanyDto,
  ) {
    return this.companiesService.update(companyId, userId, updateCompanyDto);
  }

  /**
   * Add a member to a company
   * POST /companies/:id/members
   */
  @Post(':id/members')
  @HttpCode(HttpStatus.CREATED)
  async addMember(
    @Param('id') companyId: string,
    @CurrentUser('userId') userId: string,
    @Body() addMemberDto: AddMemberDto,
  ) {
    return this.companiesService.addMember(companyId, userId, addMemberDto);
  }

  /**
   * Update a member's role or details
   * PUT /companies/:id/members/:memberId
   */
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

  /**
   * Remove a member from a company
   * DELETE /companies/:id/members/:memberId
   */
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
