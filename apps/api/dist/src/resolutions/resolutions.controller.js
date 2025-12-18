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
exports.ResolutionsController = void 0;
const common_1 = require("@nestjs/common");
const resolutions_service_1 = require("./resolutions.service");
const dto_1 = require("./dto");
const client_1 = require("@prisma/client");
let ResolutionsController = class ResolutionsController {
    resolutionsService;
    constructor(resolutionsService) {
        this.resolutionsService = resolutionsService;
    }
    create(companyId, createResolutionDto) {
        return this.resolutionsService.create(companyId, createResolutionDto);
    }
    findAll(companyId, status, category, year) {
        const filters = {};
        if (status) {
            filters.status = status;
        }
        if (category) {
            filters.category = category;
        }
        if (year) {
            const yearNum = parseInt(year, 10);
            if (!isNaN(yearNum)) {
                filters.year = yearNum;
            }
        }
        return this.resolutionsService.findAll(companyId, filters);
    }
    getNextNumber(companyId) {
        return this.resolutionsService.getNextResolutionNumber(companyId);
    }
    findOne(id) {
        return this.resolutionsService.findOne(id);
    }
    update(id, updateResolutionDto) {
        return this.resolutionsService.update(id, updateResolutionDto);
    }
    updateStatus(id, status) {
        return this.resolutionsService.updateStatus(id, status);
    }
    remove(id) {
        return this.resolutionsService.remove(id);
    }
};
exports.ResolutionsController = ResolutionsController;
__decorate([
    (0, common_1.Post)('companies/:companyId/resolutions'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateResolutionDto]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/resolutions'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('category')),
    __param(3, (0, common_1.Query)('year')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/resolutions/next-number'),
    __param(0, (0, common_1.Param)('companyId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "getNextNumber", null);
__decorate([
    (0, common_1.Get)('resolutions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('resolutions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateResolutionDto]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)('resolutions/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)('status')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)('resolutions/:id'),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ResolutionsController.prototype, "remove", null);
exports.ResolutionsController = ResolutionsController = __decorate([
    (0, common_1.Controller)(),
    (0, common_1.UsePipes)(new common_1.ValidationPipe({ whitelist: true, forbidNonWhitelisted: true })),
    __metadata("design:paramtypes", [resolutions_service_1.ResolutionsService])
], ResolutionsController);
//# sourceMappingURL=resolutions.controller.js.map