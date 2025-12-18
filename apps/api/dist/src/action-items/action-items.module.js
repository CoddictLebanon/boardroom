"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ActionItemsModule = void 0;
const common_1 = require("@nestjs/common");
const action_items_controller_1 = require("./action-items.controller");
const action_items_service_1 = require("./action-items.service");
const prisma_module_1 = require("../prisma/prisma.module");
let ActionItemsModule = class ActionItemsModule {
};
exports.ActionItemsModule = ActionItemsModule;
exports.ActionItemsModule = ActionItemsModule = __decorate([
    (0, common_1.Module)({
        imports: [prisma_module_1.PrismaModule],
        controllers: [action_items_controller_1.ActionItemsController],
        providers: [action_items_service_1.ActionItemsService],
        exports: [action_items_service_1.ActionItemsService],
    })
], ActionItemsModule);
//# sourceMappingURL=action-items.module.js.map