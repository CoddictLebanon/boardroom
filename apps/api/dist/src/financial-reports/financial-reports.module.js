"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FinancialReportsModule = void 0;
const common_1 = require("@nestjs/common");
const financial_reports_controller_1 = require("./financial-reports.controller");
const financial_reports_service_1 = require("./financial-reports.service");
const prisma_module_1 = require("../prisma/prisma.module");
let FinancialReportsModule = class FinancialReportsModule {
};
exports.FinancialReportsModule = FinancialReportsModule;
exports.FinancialReportsModule = FinancialReportsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [financial_reports_controller_1.FinancialReportsController],
        providers: [financial_reports_service_1.FinancialReportsService],
        exports: [financial_reports_service_1.FinancialReportsService],
    })
], FinancialReportsModule);
//# sourceMappingURL=financial-reports.module.js.map