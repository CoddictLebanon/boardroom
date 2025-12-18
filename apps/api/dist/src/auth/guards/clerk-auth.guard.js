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
var ClerkAuthGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkAuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const backend_1 = require("@clerk/backend");
const config_1 = require("@nestjs/config");
const public_decorator_1 = require("../decorators/public.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let ClerkAuthGuard = ClerkAuthGuard_1 = class ClerkAuthGuard {
    reflector;
    configService;
    prisma;
    logger = new common_1.Logger(ClerkAuthGuard_1.name);
    secretKey;
    clerkClient;
    constructor(reflector, configService, prisma) {
        this.reflector = reflector;
        this.configService = configService;
        this.prisma = prisma;
        this.secretKey = this.configService.get('CLERK_SECRET_KEY');
        this.clerkClient = (0, backend_1.createClerkClient)({
            secretKey: this.secretKey,
        });
    }
    onModuleInit() {
        if (!this.secretKey) {
            this.logger.warn('CLERK_SECRET_KEY is not configured. Authentication will fail for all protected routes.');
        }
    }
    async canActivate(context) {
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        if (!this.secretKey) {
            this.logger.error('CLERK_SECRET_KEY not configured');
            throw new common_1.UnauthorizedException('Authentication service not configured');
        }
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new common_1.UnauthorizedException('Missing authorization header');
        }
        if (!authHeader.startsWith('Bearer ')) {
            throw new common_1.UnauthorizedException('Invalid authorization header format');
        }
        const token = authHeader.slice(7);
        if (!token) {
            throw new common_1.UnauthorizedException('Missing token');
        }
        try {
            const verifiedToken = await (0, backend_1.verifyToken)(token, {
                secretKey: this.secretKey,
                authorizedParties: ['http://localhost:3000', 'http://localhost:3001'],
            });
            request.auth = {
                userId: verifiedToken.sub,
                sessionId: verifiedToken.sid,
                claims: verifiedToken,
            };
            await this.ensureUserExists(verifiedToken.sub);
            this.logger.log(`User authenticated: ${verifiedToken.sub}`);
            return true;
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.error(`Token verification failed: ${errorMessage}`);
            this.logger.debug(`Token prefix: ${token.substring(0, 20)}...`);
            throw new common_1.UnauthorizedException('Invalid or expired token');
        }
    }
    async ensureUserExists(userId) {
        const existingUser = await this.prisma.user.findUnique({
            where: { id: userId },
        });
        if (existingUser) {
            return;
        }
        try {
            const clerkUser = await this.clerkClient.users.getUser(userId);
            const primaryEmail = clerkUser.emailAddresses.find((email) => email.id === clerkUser.primaryEmailAddressId)?.emailAddress;
            if (!primaryEmail) {
                this.logger.warn(`User ${userId} has no primary email, skipping provisioning`);
                return;
            }
            await this.prisma.user.create({
                data: {
                    id: userId,
                    email: primaryEmail,
                    firstName: clerkUser.firstName,
                    lastName: clerkUser.lastName,
                    imageUrl: clerkUser.imageUrl,
                },
            });
            this.logger.log(`JIT provisioned user: ${userId} (${primaryEmail})`);
        }
        catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            this.logger.warn(`Failed to JIT provision user ${userId}: ${errorMessage}`);
        }
    }
};
exports.ClerkAuthGuard = ClerkAuthGuard;
exports.ClerkAuthGuard = ClerkAuthGuard = ClerkAuthGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [core_1.Reflector,
        config_1.ConfigService,
        prisma_service_1.PrismaService])
], ClerkAuthGuard);
//# sourceMappingURL=clerk-auth.guard.js.map