import { CanActivate, ExecutionContext, OnModuleInit } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class ClerkAuthGuard implements CanActivate, OnModuleInit {
    private readonly reflector;
    private readonly configService;
    private readonly prisma;
    private readonly logger;
    private readonly secretKey;
    private readonly clerkClient;
    constructor(reflector: Reflector, configService: ConfigService, prisma: PrismaService);
    onModuleInit(): void;
    canActivate(context: ExecutionContext): Promise<boolean>;
    private ensureUserExists;
}
