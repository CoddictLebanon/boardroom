import { Catch, ArgumentsHost, HttpException, HttpStatus, ExceptionFilter, Logger } from '@nestjs/common';
import { Request, Response } from 'express';
import { Prisma } from '@prisma/client';
import * as Sentry from '@sentry/nestjs';

interface ErrorResponse {
  statusCode: number;
  message: string;
  error: string;
  path: string;
  timestamp: string;
}

/**
 * Combined exception filter that:
 * 1. Captures server errors (500+) to Sentry
 * 2. Provides consistent error response format
 * 3. Handles Prisma errors gracefully
 */
@Catch()
export class SentryExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(SentryExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Internal server error';
    let error = 'Internal Server Error';

    // Handle HTTP exceptions
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === 'string') {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === 'object') {
        const responseObj = exceptionResponse as Record<string, unknown>;
        message = (responseObj.message as string) || message;
        error = (responseObj.error as string) || exception.name;
      }
    }
    // Handle Prisma errors
    else if (exception instanceof Prisma.PrismaClientKnownRequestError) {
      switch (exception.code) {
        case 'P2002':
          status = HttpStatus.CONFLICT;
          message = 'A record with this value already exists';
          error = 'Conflict';
          break;
        case 'P2025':
          status = HttpStatus.NOT_FOUND;
          message = 'Record not found';
          error = 'Not Found';
          break;
        case 'P2003':
          status = HttpStatus.BAD_REQUEST;
          message = 'Invalid reference - related record not found';
          error = 'Bad Request';
          break;
        default:
          message = 'Database operation failed';
          error = 'Database Error';
      }
    }
    // Handle Prisma validation errors
    else if (exception instanceof Prisma.PrismaClientValidationError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Invalid data provided';
      error = 'Validation Error';
    }

    // Capture 500+ errors to Sentry
    if (status >= 500) {
      Sentry.captureException(exception);
      this.logger.error(
        `${request.method} ${request.url} - ${status} ${error}`,
        exception instanceof Error ? exception.stack : String(exception),
      );
    } else {
      this.logger.warn(
        `${request.method} ${request.url} - ${status} ${error}: ${message}`,
      );
    }

    const errorResponse: ErrorResponse = {
      statusCode: status,
      message,
      error,
      path: request.url,
      timestamp: new Date().toISOString(),
    };

    response.status(status).json(errorResponse);
  }
}
