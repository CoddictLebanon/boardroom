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
Object.defineProperty(exports, "__esModule", { value: true });
exports.MonthlyFinancialsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const library_1 = require("@prisma/client/runtime/library");
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
let MonthlyFinancialsService = class MonthlyFinancialsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verifyCompanyAccess(companyId, userId) {
        const membership = await this.prisma.companyMember.findFirst({
            where: { companyId, userId, status: 'ACTIVE' },
        });
        if (!membership) {
            throw new common_1.ForbiddenException('You do not have access to this company');
        }
        return membership;
    }
    async getYearData(companyId, year) {
        const records = await this.prisma.monthlyFinancial.findMany({
            where: { companyId, year },
            orderBy: { month: 'asc' },
        });
        const monthsData = [];
        for (let month = 1; month <= 12; month++) {
            const record = records.find((r) => r.month === month);
            if (record) {
                monthsData.push({
                    ...record,
                    revenue: Number(record.revenue),
                    cost: Number(record.cost),
                    profit: Number(record.profit),
                });
            }
            else {
                monthsData.push({
                    id: null,
                    companyId,
                    year,
                    month,
                    revenue: null,
                    cost: null,
                    profit: null,
                    pdfPath: null,
                    notes: null,
                });
            }
        }
        return monthsData;
    }
    async upsertMonth(companyId, year, month, dto) {
        if (month < 1 || month > 12) {
            throw new common_1.BadRequestException('Month must be between 1 and 12');
        }
        const profit = dto.revenue - dto.cost;
        return this.prisma.monthlyFinancial.upsert({
            where: {
                companyId_year_month: { companyId, year, month },
            },
            create: {
                companyId,
                year,
                month,
                revenue: new library_1.Decimal(dto.revenue),
                cost: new library_1.Decimal(dto.cost),
                profit: new library_1.Decimal(profit),
                notes: dto.notes,
            },
            update: {
                revenue: new library_1.Decimal(dto.revenue),
                cost: new library_1.Decimal(dto.cost),
                profit: new library_1.Decimal(profit),
                notes: dto.notes,
            },
        });
    }
    async savePdf(companyId, year, month, file) {
        if (month < 1 || month > 12) {
            throw new common_1.BadRequestException('Month must be between 1 and 12');
        }
        const uploadDir = path.join(process.cwd(), 'uploads', 'financials', companyId, String(year));
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        const filePath = path.join(uploadDir, `${month}.pdf`);
        fs.writeFileSync(filePath, file.buffer);
        await this.prisma.monthlyFinancial.upsert({
            where: {
                companyId_year_month: { companyId, year, month },
            },
            create: {
                companyId,
                year,
                month,
                revenue: new library_1.Decimal(0),
                cost: new library_1.Decimal(0),
                profit: new library_1.Decimal(0),
                pdfPath: filePath,
            },
            update: {
                pdfPath: filePath,
            },
        });
        return { success: true };
    }
    async getPdfPath(companyId, year, month) {
        if (month < 1 || month > 12) {
            throw new common_1.BadRequestException('Month must be between 1 and 12');
        }
        const record = await this.prisma.monthlyFinancial.findUnique({
            where: {
                companyId_year_month: { companyId, year, month },
            },
        });
        if (!record?.pdfPath || !fs.existsSync(record.pdfPath)) {
            throw new common_1.NotFoundException('PDF not found');
        }
        return record.pdfPath;
    }
    async deletePdf(companyId, year, month) {
        if (month < 1 || month > 12) {
            throw new common_1.BadRequestException('Month must be between 1 and 12');
        }
        const record = await this.prisma.monthlyFinancial.findUnique({
            where: {
                companyId_year_month: { companyId, year, month },
            },
        });
        if (record?.pdfPath && fs.existsSync(record.pdfPath)) {
            fs.unlinkSync(record.pdfPath);
        }
        await this.prisma.monthlyFinancial.update({
            where: {
                companyId_year_month: { companyId, year, month },
            },
            data: { pdfPath: null },
        });
        return { success: true };
    }
};
exports.MonthlyFinancialsService = MonthlyFinancialsService;
exports.MonthlyFinancialsService = MonthlyFinancialsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], MonthlyFinancialsService);
//# sourceMappingURL=monthly-financials.service.js.map