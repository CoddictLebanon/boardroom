import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken, createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ClerkAuthGuard implements CanActivate, OnModuleInit {
  private readonly logger = new Logger(ClerkAuthGuard.name);
  private readonly secretKey: string | undefined;
  private readonly clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    private readonly reflector: Reflector,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    this.secretKey = this.configService.get<string>('CLERK_SECRET_KEY');
    this.clerkClient = createClerkClient({
      secretKey: this.secretKey,
    });
  }

  onModuleInit() {
    if (!this.secretKey) {
      this.logger.warn(
        'CLERK_SECRET_KEY is not configured. Authentication will fail for all protected routes.',
      );
    }
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    // Ensure Clerk is configured
    if (!this.secretKey) {
      this.logger.error('CLERK_SECRET_KEY not configured');
      throw new UnauthorizedException('Authentication service not configured');
    }

    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    // Validate Bearer token format
    if (!authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Invalid authorization header format');
    }

    const token = authHeader.slice(7); // Remove 'Bearer ' prefix

    if (!token) {
      throw new UnauthorizedException('Missing token');
    }

    try {
      // Verify the JWT token with Clerk
      // Get the issuer from the token to properly verify
      // Build authorized parties list from environment
      const frontendUrl = this.configService.get<string>('FRONTEND_URL');
      const authorizedParties = [
        'http://localhost:3000',
        'http://localhost:3001',
      ];
      if (frontendUrl) {
        authorizedParties.push(frontendUrl);
      }

      const verifiedToken = await verifyToken(token, {
        secretKey: this.secretKey,
        authorizedParties,
      });

      // Attach user info to request
      request.auth = {
        userId: verifiedToken.sub,
        sessionId: verifiedToken.sid,
        claims: verifiedToken,
      };

      // JIT (Just-in-Time) user provisioning for local development
      // This creates the user in our database if they don't exist yet
      await this.ensureUserExists(verifiedToken.sub);

      this.logger.log(`User authenticated: ${verifiedToken.sub}`);
      return true;
    } catch (error) {
      // Log error information for debugging
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.error(`Token verification failed: ${errorMessage}`);
      // Log first few chars of token for debugging (safe, doesn't expose full token)
      this.logger.debug(`Token prefix: ${token.substring(0, 20)}...`);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /**
   * Ensures the user exists in our database, creating them if necessary.
   * This is useful for local development where Clerk webhooks may not be configured.
   */
  private async ensureUserExists(userId: string): Promise<void> {
    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (existingUser) {
      return;
    }

    // User doesn't exist, fetch from Clerk and create
    try {
      const clerkUser = await this.clerkClient.users.getUser(userId);

      const primaryEmail = clerkUser.emailAddresses.find(
        (email) => email.id === clerkUser.primaryEmailAddressId,
      )?.emailAddress;

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
    } catch (error) {
      // Log but don't fail authentication - the user might get created later
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Failed to JIT provision user ${userId}: ${errorMessage}`);
    }
  }
}
