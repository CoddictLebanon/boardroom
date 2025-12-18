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
exports.UpdateActionItemStatusDto = exports.UpdateActionItemDto = void 0;
const class_validator_1 = require("class-validator");
const client_1 = require("@prisma/client");
class UpdateActionItemDto {
    title;
    description;
    assigneeId;
    dueDate;
    priority;
    status;
}
exports.UpdateActionItemDto = UpdateActionItemDto;
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActionItemDto.prototype, "title", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActionItemDto.prototype, "description", void 0);
__decorate([
    (0, class_validator_1.IsString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActionItemDto.prototype, "assigneeId", void 0);
__decorate([
    (0, class_validator_1.IsDateString)(),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActionItemDto.prototype, "dueDate", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.Priority),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActionItemDto.prototype, "priority", void 0);
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ActionStatus),
    (0, class_validator_1.IsOptional)(),
    __metadata("design:type", String)
], UpdateActionItemDto.prototype, "status", void 0);
class UpdateActionItemStatusDto {
    status;
}
exports.UpdateActionItemStatusDto = UpdateActionItemStatusDto;
__decorate([
    (0, class_validator_1.IsEnum)(client_1.ActionStatus),
    __metadata("design:type", String)
], UpdateActionItemStatusDto.prototype, "status", void 0);
//# sourceMappingURL=update-action-item.dto.js.map