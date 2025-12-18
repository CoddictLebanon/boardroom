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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CreateFinancialReportDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class CreateFinancialReportDto {
    type;
    fiscalYear;
    period;
    data;
    storageKey;
    validate() {
        if (!this.data && !this.storageKey) {
            throw new Error('Either data or storageKey must be provided');
        }
    }
}
exports.CreateFinancialReportDto = CreateFinancialReportDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.FinancialReportType),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateFinancialReportDto.prototype, "type", void 0);
__decorate([
    (0, class_validator_1.IsInt)(),
    (0, class_validator_1.Min)(1900),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", Number)
], CreateFinancialReportDto.prototype, "fiscalYear", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsNotEmpty)(),
    __metadata("design:type", String)
], CreateFinancialReportDto.prototype, "period", void 0);
__decorate([
    (0, class_validator_1.IsObject)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => !o.storageKey),
    __metadata("design:type", Object)
], CreateFinancialReportDto.prototype, "data", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    (0, class_validator_1.ValidateIf)((o) => !o.data),
    __metadata("design:type", String)
], CreateFinancialReportDto.prototype, "storageKey", void 0);
//# sourceMappingURL=create-financial-report.dto.js.map