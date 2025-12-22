import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/http-exception.filter';
import { SentryExceptionFilter } from './common/filters/sentry-exception.filter';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import * as Sentry from '@sentry/nestjs';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  // Initialize Sentry before creating the app
  if (process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV || 'development',
      tracesSampleRate: 0,
      sendDefaultPii: false,
    });
    logger.log('Sentry initialized for error tracking');
  }

  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log'],
    rawBody: true, // Enable raw body for webhook signature verification
  });

  // Global exception filter - use Sentry-enabled filter if DSN is configured
  if (process.env.SENTRY_DSN) {
    app.useGlobalFilters(new SentryExceptionFilter());
  } else {
    app.useGlobalFilters(new GlobalExceptionFilter());
  }

  // API versioning
  app.setGlobalPrefix('api/v1');

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('Boardroom API')
    .setDescription('Board meeting management platform API')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // CORS configuration
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:3000',
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, Postman, etc.)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // Validation pipe with enhanced settings
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  const port = process.env.PORT ?? 3001;
  await app.listen(port);

  logger.log(`Application running on port ${port}`);
  logger.log(`API available at http://localhost:${port}/api/v1`);
  logger.log(`API docs available at http://localhost:${port}/api/docs`);
}
bootstrap();
