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
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialReportsController = void 0;
const common_1 = require("@nestjs/common");
const financial_reports_service_1 = require("./financial-reports.service");
const dto_1 = require("./dto");
const client_1 = require("@prisma/client");
let FinancialReportsController = class FinancialReportsController {
    financialReportsService;
    constructor(financialReportsService) {
        this.financialReportsService = financialReportsService;
    }
    async create(companyId, createDto) {
        return this.financialReportsService.create(companyId, createDto);
    }
    async findAll(companyId, type, fiscalYear, period, status) {
        const filters = {
            ...(type && { type }),
            ...(fiscalYear && { fiscalYear: parseInt(fiscalYear, 10) }),
            ...(period && { period }),
            ...(status && { status }),
        };
        return this.financialReportsService.findAll(companyId, filters);
    }
    async findOne(id) {
        return this.financialReportsService.findOne(id);
    }
    async update(id, updateDto) {
        return this.financialReportsService.update(id, updateDto);
    }
    async finalize(id) {
        return this.financialReportsService.finalize(id);
    }
    async remove(id) {
        await this.financialReportsService.remove(id);
    }
    async uploadFile(id, storageKey) {
        return this.financialReportsService.uploadFile(id, storageKey);
    }
};
exports.FinancialReportsController = FinancialReportsController;
__decorate([
    (0, common_1.Post)('companies/:companyId/financial-reports'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateFinancialReportDto]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/financial-reports'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('type')),
    __param(2, (0, common_1.Query)('fiscalYear')),
    __param(3, (0, common_1.Query)('period')),
    __param(4, (0, common_1.Query)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('financial-reports/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('financial-reports/:id'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateFinancialReportDto]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)('financial-reports/:id/finalize'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "finalize", null);
__decorate([
    (0, common_1.Delete)('financial-reports/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.NO_CONTENT),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "remove", null);
__decorate([
    (0, common_1.Post)('financial-reports/:id/upload'),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('storageKey')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], FinancialReportsController.prototype, "uploadFile", null);
exports.FinancialReportsController = FinancialReportsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [financial_reports_service_1.FinancialReportsService])
], FinancialReportsController);
//# sourceMappingURL=financial-reports.controller.js.map