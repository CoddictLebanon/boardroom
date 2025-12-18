"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var CompaniesController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CompaniesController = void 0;
const common_1 = require("@nestjs/common");
const companies_service_1 = require("./companies.service");
const dto_1 = require("./dto");
const decorators_1 = require("../auth/decorators");
let CompaniesController = CompaniesController_1 = class CompaniesController {
    companiesService;
    logger = new common_1.Logger(CompaniesController_1.name);
    constructor(companiesService) {
        this.companiesService = companiesService;
    }
    async create(userId, createCompanyDto) {
        this.logger.log(`POST /companies - userId: ${userId}, name: ${createCompanyDto?.name}`);
        return this.companiesService.create(userId, createCompanyDto);
    }
    async findUserCompanies(userId) {
        this.logger.log(`GET /companies - userId: ${userId}`);
        return this.companiesService.findUserCompanies(userId);
    }
    async findOne(companyId, userId) {
        return this.companiesService.findOne(companyId, userId);
    }
    async update(companyId, userId, updateCompanyDto) {
        return this.companiesService.update(companyId, userId, updateCompanyDto);
    }
    async addMember(companyId, userId, addMemberDto) {
        return this.companiesService.addMember(companyId, userId, addMemberDto);
    }
    async updateMember(companyId, memberId, userId, updateMemberDto) {
        return this.companiesService.updateMember(companyId, memberId, userId, updateMemberDto);
    }
    async removeMember(companyId, memberId, userId) {
        return this.companiesService.removeMember(companyId, memberId, userId);
    }
};
exports.CompaniesController = CompaniesController;
__decorate([
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, decorators_1.CurrentUser)('userId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "findUserCompanies", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateCompanyDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "update", null);
__decorate([
    (0, common_1.Post)(':id/members'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.AddMemberDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "addMember", null);
__decorate([
    (0, common_1.Put)(':id/members/:memberId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __param(3, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, dto_1.UpdateMemberDto]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "updateMember", null);
__decorate([
    (0, common_1.Delete)(':id/members/:memberId'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('memberId')),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", Promise)
], CompaniesController.prototype, "removeMember", null);
exports.CompaniesController = CompaniesController = CompaniesController_1 = __decorate([
    (0, common_1.Controller)('companies'),
    __metadata("design:paramtypes", [companies_service_1.CompaniesService])
], CompaniesController);
//# sourceMappingURL=companies.controller.js.map