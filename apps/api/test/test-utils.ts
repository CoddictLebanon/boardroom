import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { APP_GUARD, Reflector } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { CompaniesModule } from '../src/companies/companies.module';
import { MeetingsModule } from '../src/meetings/meetings.module';
import { AgendaItemsModule } from '../src/agenda-items/agenda-items.module';
import { ActionItemsModule } from '../src/action-items/action-items.module';
import { DocumentsModule } from '../src/documents/documents.module';
import { ResolutionsModule } from '../src/resolutions/resolutions.module';
import { FinancialReportsModule } from '../src/financial-reports/financial-reports.module';
import { OkrsModule } from '../src/okrs/okrs.module';
import { GatewayModule } from '../src/gateway/gateway.module';
import { PermissionsModule } from '../src/permissions/permissions.module';
import { AppController } from '../src/app.controller';
import { AppService } from '../src/app.service';
import {
  CanActivate,
  ExecutionContext,
  Injectable,
} from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../src/auth/decorators/public.decorator';

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

// Mock auth guard that always authenticates with test user
@Injectable()
export class MockAuthGuard implements CanActivate {
  private mockUserId: string = TEST_USER.id;
  private reflector = new Reflector();

  setMockUserId(userId: string) {
    this.mockUserId = userId;
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

// Create a test application with mocked auth
export async function createTestApp(): Promise<{
  app: INestApplication;
  prisma: PrismaService;
  mockAuthGuard: MockAuthGuard;
}> {
  const mockAuthGuard = new MockAuthGuard();

  // Build test module without AuthModule - use mock guard instead
  const moduleFixture: TestingModule = await Test.createTestingModule({
    imports: [
      ConfigModule.forRoot({
        isGlobal: true,
      }),
      PrismaModule,
      PermissionsModule,
      GatewayModule,
      CompaniesModule,
      MeetingsModule,
      AgendaItemsModule,
      ActionItemsModule,
      DocumentsModule,
      ResolutionsModule,
      FinancialReportsModule,
      OkrsModule,
    ],
    controllers: [AppController],
    providers: [
      AppService,
      {
        provide: APP_GUARD,
        useValue: mockAuthGuard,
      },
    ],
  }).compile();

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
