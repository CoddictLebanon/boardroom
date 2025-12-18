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
exports.InvitationsController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const invitations_service_1 = require("./invitations.service");
const dto_1 = require("./dto");
const decorators_1 = require("../auth/decorators");
let InvitationsController = class InvitationsController {
    invitationsService;
    constructor(invitationsService) {
        this.invitationsService = invitationsService;
    }
    createInvitation(companyId, userId, dto) {
        return this.invitationsService.createInvitation(companyId, userId, dto);
    }
    listInvitations(companyId, userId) {
        return this.invitationsService.listInvitations(companyId, userId);
    }
    revokeInvitation(id, userId) {
        return this.invitationsService.revokeInvitation(id, userId);
    }
};
exports.InvitationsController = InvitationsController;
__decorate([
    (0, common_1.Post)('companies/:companyId/invitations'),
    (0, common_1.HttpCode)(common_1.HttpStatus.CREATED),
    (0, swagger_1.ApiOperation)({ summary: 'Create an invitation' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __param(2, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.CreateInvitationDto]),
    __metadata("design:returntype", void 0)
], InvitationsController.prototype, "createInvitation", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/invitations'),
    (0, swagger_1.ApiOperation)({ summary: 'List invitations for a company' }),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InvitationsController.prototype, "listInvitations", null);
__decorate([
    (0, common_1.Delete)('invitations/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Revoke an invitation' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], InvitationsController.prototype, "revokeInvitation", null);
exports.InvitationsController = InvitationsController = __decorate([
    (0, swagger_1.ApiTags)('invitations'),
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [invitations_service_1.InvitationsService])
], InvitationsController);
//# sourceMappingURL=invitations.controller.js.map