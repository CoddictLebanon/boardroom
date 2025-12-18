"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyFinancialsController = void 0;
const common_1 = require("@nestjs/common");
const platform_express_1 = require("@nestjs/platform-express");
const clerk_auth_guard_1 = require("../auth/guards/clerk-auth.guard");
const decorators_1 = require("../auth/decorators");
const monthly_financials_service_1 = require("./monthly-financials.service");
const upsert_monthly_financial_dto_1 = require("./dto/upsert-monthly-financial.dto");
const fs = __importStar(require("fs"));
let MonthlyFinancialsController = class MonthlyFinancialsController {
    monthlyFinancialsService;
    constructor(monthlyFinancialsService) {
        this.monthlyFinancialsService = monthlyFinancialsService;
    }
    async getYearData(companyId, year, userId) {
        await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
        return this.monthlyFinancialsService.getYearData(companyId, year);
    }
    async upsertMonth(companyId, year, month, dto, userId) {
        await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
        return this.monthlyFinancialsService.upsertMonth(companyId, year, month, dto);
    }
    async uploadPdf(companyId, year, month, file, userId) {
        if (!file || file.mimetype !== 'application/pdf') {
            throw new common_1.BadRequestException('Only PDF files are allowed');
        }
        await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
        return this.monthlyFinancialsService.savePdf(companyId, year, month, file);
    }
    async downloadPdf(companyId, year, month, userId, res) {
        await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
        const pdfPath = await this.monthlyFinancialsService.getPdfPath(companyId, year, month);
        const fileStream = fs.createReadStream(pdfPath);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${month}-${year}.pdf"`);
        fileStream.pipe(res);
    }
    async deletePdf(companyId, year, month, userId) {
        await this.monthlyFinancialsService.verifyCompanyAccess(companyId, userId);
        return this.monthlyFinancialsService.deletePdf(companyId, year, month);
    }
};
exports.MonthlyFinancialsController = MonthlyFinancialsController;
__decorate([
    (0, common_1.Get)('companies/:companyId/monthly-financials'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('year', common_1.ParseIntPipe)),
    __param(2, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, String]),
    __metadata("design:returntype", Promise)
], MonthlyFinancialsController.prototype, "getYearData", null);
__decorate([
    (0, common_1.Put)('companies/:companyId/monthly-financials/:year/:month'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('month', common_1.ParseIntPipe)),
    __param(3, (0, common_1.Body)()),
    __param(4, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, upsert_monthly_financial_dto_1.UpsertMonthlyFinancialDto, String]),
    __metadata("design:returntype", Promise)
], MonthlyFinancialsController.prototype, "upsertMonth", null);
__decorate([
    (0, common_1.Post)('companies/:companyId/monthly-financials/:year/:month/pdf'),
    (0, common_1.UseInterceptors)((0, platform_express_1.FileInterceptor)('file', {
        limits: { fileSize: 10 * 1024 * 1024 }
    })),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('month', common_1.ParseIntPipe)),
    __param(3, (0, common_1.UploadedFile)()),
    __param(4, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, Object, String]),
    __metadata("design:returntype", Promise)
], MonthlyFinancialsController.prototype, "uploadPdf", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/monthly-financials/:year/:month/pdf'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('month', common_1.ParseIntPipe)),
    __param(3, (0, decorators_1.CurrentUser)()),
    __param(4, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String, Object]),
    __metadata("design:returntype", Promise)
], MonthlyFinancialsController.prototype, "downloadPdf", null);
__decorate([
    (0, common_1.Delete)('companies/:companyId/monthly-financials/:year/:month/pdf'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Param)('year', common_1.ParseIntPipe)),
    __param(2, (0, common_1.Param)('month', common_1.ParseIntPipe)),
    __param(3, (0, decorators_1.CurrentUser)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Number, Number, String]),
    __metadata("design:returntype", Promise)
], MonthlyFinancialsController.prototype, "deletePdf", null);
exports.MonthlyFinancialsController = MonthlyFinancialsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UseGuards)(clerk_auth_guard_1.ClerkAuthGuard),
    __metadata("design:paramtypes", [monthly_financials_service_1.MonthlyFinancialsService])
], MonthlyFinancialsController);
//# sourceMappingURL=monthly-financials.controller.js.map