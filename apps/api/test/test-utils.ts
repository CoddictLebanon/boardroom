import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { resolve } from 'path';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CompaniesModule } from '../src/companies/companies.module';
import { MeetingsModule } from '../src/meetings/meetings.module';
import { ActionItemsModule } from '../src/action-items/action-items.module';
import { DocumentsModule } from '../src/documents/documents.module';
import { ResolutionsModule } from '../src/resolutions/resolutions.module';
import { FinancialReportsModule } from '../src/financial-reports/financial-reports.module';
import { PermissionsModule } from '../src/permissions/permissions.module';
import { CustomRolesModule } from '../src/custom-roles/custom-roles.module';
import { InvitationsModule } from '../src/invitations/invitations.module';
import { MonthlyFinancialsModule } from '../src/monthly-financials/monthly-financials.module';
import { EmailModule } from '../src/email/email.module';
import { MeetingNotesModule } from '../src/meeting-notes/meeting-notes.module';
import { AgendaItemsModule } from '../src/agenda-items/agenda-items.module';
import { GatewayModule } from '../src/gateway/gateway.module';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../src/auth/decorators/public.decorator';
import { PERMISSIONS_KEY } from '../src/permissions/require-permission.decorator';
import { ClerkAuthGuard } from '../src/auth/guards/clerk-auth.guard';
import { PermissionGuard } from '../src/permissions/permission.guard';

// Mock user data for testing
export const TEST_USER = {
  id: 'user_test_123',
  email: 'test@example.com',
  firstName: 'Test',
  lastName: 'User',
};

export const TEST_USER_2 = {
  id: 'user_test_456',
  email: 'test2@example.com',
  firstName: 'Another',
  lastName: 'User',
};

// Mock auth guard that always authenticates with test user and bypasses permission checks
@Injectable()
export class MockAuthGuard implements CanActivate {
  private mockUserId: string = TEST_USER.id;
  private reflector = new Reflector();

  setMockUserId(userId: string) {
    this.mockUserId = userId;
  }

  getMockUserId(): string {
    return this.mockUserId;
  }

  canActivate(context: ExecutionContext): boolean {
    // Check for public routes using proper reflector
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();

    // Set mock auth data
    request.auth = {
      userId: this.mockUserId,
      sessionId: 'session_test_123',
      claims: {},
    };

    return true;
  }
}

// Mock permission guard that always allows (for E2E tests we test permissions separately)
@Injectable()
export class MockPermissionGuard implements CanActivate {
  canActivate(): boolean {
    return true;
  }
}

// Create a test application with mocked auth
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  mockAuthGuard: MockAuthGuard;
}> {
  const mockAuthGuard = new MockAuthGuard();
  const mockPermissionGuard = new MockPermissionGuard();

  // Build test module without AuthModule - use mock guards instead
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
        envFilePath: resolve(__dirname, '../.env.test'),
      }),
      PrismaModule,
      EmailModule,
      PermissionsModule,
      CustomRolesModule,
      CompaniesModule,
      MeetingsModule,
      ActionItemsModule,
      DocumentsModule,
      ResolutionsModule,
      FinancialReportsModule,
      MonthlyFinancialsModule,
      InvitationsModule,
      GatewayModule,
      MeetingNotesModule,
      AgendaItemsModule,
    ],
    controllers: [AppController],
    providers: [
      AppService,
      {
        provide: APP_GUARD,
        useValue: mockAuthGuard,
      },
    ],
  })
    .overrideGuard(ClerkAuthGuard)
    .useValue(mockAuthGuard)
    .overrideGuard(PermissionGuard)
    .useValue(mockPermissionGuard)
    .compile();

  const app = moduleFixture.createNestApplication();

  // Apply same pipes as main.ts
  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  await app.init();

  const prisma = moduleFixture.get<PrismaService>(PrismaService);

  return { app, prisma, mockAuthGuard };
}

// Helper to create a test user in the database
export async function createTestUser(
  prisma: PrismaService,
  userData: typeof TEST_USER = TEST_USER,
) {
  // Check if user exists first to avoid unique constraint errors
  const existingUser = await prisma.user.findUnique({
    where: { id: userData.id },
  });

  if (existingUser) {
    return existingUser;
  }

  return prisma.user.create({
    data: {
      id: userData.id,
      email: userData.email,
      firstName: userData.firstName,
      lastName: userData.lastName,
    },
  });
}

// Helper to create a test company
export async function createTestCompany(
  prisma: PrismaService,
  userId: string,
  name: string = 'Test Company',
) {
  const company = await prisma.company.create({
    data: {
      name,
      members: {
        create: {
          userId,
          role: 'OWNER',
          status: 'ACTIVE',
        },
      },
    },
    include: {
      members: true,
    },
  });
  return company;
}

// Helper to clean specific tables
export async function cleanTables(prisma: PrismaService, tables: string[]) {
  for (const table of tables.reverse()) {
    await prisma.$executeRawUnsafe(
      `TRUNCATE TABLE "public"."${table}" CASCADE;`,
    );
  }
}
