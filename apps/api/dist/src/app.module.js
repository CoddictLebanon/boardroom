"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const companies_module_1 = require("./companies/companies.module");
const meetings_module_1 = require("./meetings/meetings.module");
const action_items_module_1 = require("./action-items/action-items.module");
const documents_module_1 = require("./documents/documents.module");
const resolutions_module_1 = require("./resolutions/resolutions.module");
const financial_reports_module_1 = require("./financial-reports/financial-reports.module");
const gateway_module_1 = require("./gateway/gateway.module");
const invitations_module_1 = require("./invitations/invitations.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            companies_module_1.CompaniesModule,
            meetings_module_1.MeetingsModule,
            action_items_module_1.ActionItemsModule,
            documents_module_1.DocumentsModule,
            resolutions_module_1.ResolutionsModule,
            financial_reports_module_1.FinancialReportsModule,
            gateway_module_1.GatewayModule,
            invitations_module_1.InvitationsModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [app_service_1.AppService],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map