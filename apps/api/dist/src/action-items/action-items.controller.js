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
exports.ActionItemsController = void 0;
const common_1 = require("@nestjs/common");
const action_items_service_1 = require("./action-items.service");
const dto_1 = require("./dto");
const client_1 = require("@prisma/client");
const decorators_1 = require("../auth/decorators");
let ActionItemsController = class ActionItemsController {
    actionItemsService;
    constructor(actionItemsService) {
        this.actionItemsService = actionItemsService;
    }
    create(companyId, createActionItemDto, userId) {
        return this.actionItemsService.create(companyId, createActionItemDto, userId);
    }
    findAll(companyId, status, assigneeId, priority, dueDateFrom, dueDateTo, userId) {
        return this.actionItemsService.findAll(companyId, userId, {
            status,
            assigneeId,
            priority,
            dueDateFrom,
            dueDateTo,
        });
    }
    findMyActionItems(userId) {
        return this.actionItemsService.findMyActionItems(userId);
    }
    findOne(id, userId) {
        return this.actionItemsService.findOne(id, userId);
    }
    update(id, updateActionItemDto, userId) {
        return this.actionItemsService.update(id, updateActionItemDto, userId);
    }
    updateStatus(id, updateStatusDto, userId) {
        return this.actionItemsService.updateStatus(id, updateStatusDto, userId);
    }
    remove(id, userId) {
        return this.actionItemsService.remove(id, userId);
    }
};
exports.ActionItemsController = ActionItemsController;
__decorate([
    (0, common_1.Post)('companies/:companyId/action-items'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateActionItemDto, String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/action-items'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('assigneeId')),
    __param(3, (0, common_1.Query)('priority')),
    __param(4, (0, common_1.Query)('dueDateFrom')),
    __param(5, (0, common_1.Query)('dueDateTo')),
    __param(6, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String, String, String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "findAll", null);
__decorate([
    (0, common_1.Get)('action-items/my'),
    __param(0, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "findMyActionItems", null);
__decorate([
    (0, common_1.Get)('action-items/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)('action-items/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateActionItemDto, String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "update", null);
__decorate([
    (0, common_1.Put)('action-items/:id/status'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateActionItemStatusDto, String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "updateStatus", null);
__decorate([
    (0, common_1.Delete)('action-items/:id'),
    (0, common_1.HttpCode)(common_1.HttpStatus.OK),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ActionItemsController.prototype, "remove", null);
exports.ActionItemsController = ActionItemsController = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [action_items_service_1.ActionItemsService])
], ActionItemsController);
//# sourceMappingURL=action-items.controller.js.map