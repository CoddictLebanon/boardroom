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
var MeetingsController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MeetingsController = void 0;
const common_1 = require("@nestjs/common");
const meetings_service_1 = require("./meetings.service");
const dto_1 = require("./dto");
const client_1 = require("@prisma/client");
const decorators_1 = require("../auth/decorators");
let MeetingsController = MeetingsController_1 = class MeetingsController {
    meetingsService;
    logger = new common_1.Logger(MeetingsController_1.name);
    constructor(meetingsService) {
        this.meetingsService = meetingsService;
    }
    async createMeeting(companyId, createMeetingDto, userId) {
        return this.meetingsService.createMeeting(companyId, userId, createMeetingDto);
    }
    async getMeetings(companyId, status, upcoming, past, userId) {
        const filters = {};
        if (status)
            filters.status = status;
        if (upcoming === 'true')
            filters.upcoming = true;
        if (past === 'true')
            filters.past = true;
        return this.meetingsService.getMeetings(companyId, userId, filters);
    }
    async getMeeting(id, userId) {
        return this.meetingsService.getMeeting(id, userId);
    }
    async updateMeeting(id, updateMeetingDto, userId) {
        return this.meetingsService.updateMeeting(id, userId, updateMeetingDto);
    }
    async cancelMeeting(id, userId) {
        return this.meetingsService.cancelMeeting(id, userId);
    }
    async addAgendaItem(id, createAgendaItemDto, userId) {
        this.logger.log(`POST /meetings/${id}/agenda - userId: ${userId}, title: ${createAgendaItemDto?.title}`);
        return this.meetingsService.addAgendaItem(id, userId, createAgendaItemDto);
    }
    async updateAgendaItem(id, itemId, updateAgendaItemDto, userId) {
        return this.meetingsService.updateAgendaItem(id, itemId, userId, updateAgendaItemDto);
    }
    async addAttendees(id, addAttendeesDto, userId) {
        return this.meetingsService.addAttendees(id, userId, addAttendeesDto);
    }
    async markAttendance(id, attendeeId, markAttendanceDto, userId) {
        return this.meetingsService.markAttendance(id, attendeeId, userId, markAttendanceDto);
    }
    async createDecision(id, createDecisionDto, userId) {
        return this.meetingsService.createDecision(id, userId, createDecisionDto);
    }
    async castVote(id, decisionId, castVoteDto, userId) {
        return this.meetingsService.castVote(id, decisionId, userId, castVoteDto);
    }
    async completeMeeting(id, userId) {
        return this.meetingsService.completeMeeting(id, userId);
    }
};
exports.MeetingsController = MeetingsController;
__decorate([
    (0, common_1.Post)('companies/:companyId/meetings'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateMeetingDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "createMeeting", null);
__decorate([
    (0, common_1.Get)('companies/:companyId/meetings'),
    __param(0, (0, common_1.Param)('companyId')),
    __param(1, (0, common_1.Query)('status')),
    __param(2, (0, common_1.Query)('upcoming')),
    __param(3, (0, common_1.Query)('past')),
    __param(4, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getMeetings", null);
__decorate([
    (0, common_1.Get)('meetings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "getMeeting", null);
__decorate([
    (0, common_1.Put)('meetings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.UpdateMeetingDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "updateMeeting", null);
__decorate([
    (0, common_1.Delete)('meetings/:id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "cancelMeeting", null);
__decorate([
    (0, common_1.Post)('meetings/:id/agenda'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateAgendaItemDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "addAgendaItem", null);
__decorate([
    (0, common_1.Put)('meetings/:id/agenda/:itemId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('itemId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.UpdateAgendaItemDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "updateAgendaItem", null);
__decorate([
    (0, common_1.Post)('meetings/:id/attendees'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.AddAttendeesDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "addAttendees", null);
__decorate([
    (0, common_1.Put)('meetings/:id/attendees/:attendeeId'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('attendeeId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.MarkAttendanceDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "markAttendance", null);
__decorate([
    (0, common_1.Post)('meetings/:id/decisions'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, dto_1.CreateDecisionDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "createDecision", null);
__decorate([
    (0, common_1.Post)('meetings/:id/decisions/:decisionId/vote'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Param)('decisionId')),
    __param(2, (0, common_1.Body)()),
    __param(3, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, dto_1.CastVoteDto, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "castVote", null);
__decorate([
    (0, common_1.Post)('meetings/:id/complete'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, decorators_1.CurrentUser)('userId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", Promise)
], MeetingsController.prototype, "completeMeeting", null);
exports.MeetingsController = MeetingsController = MeetingsController_1 = __decorate([
    (0, common_1.Controller)(),
    __metadata("design:paramtypes", [meetings_service_1.MeetingsService])
], MeetingsController);
//# sourceMappingURL=meetings.controller.js.map