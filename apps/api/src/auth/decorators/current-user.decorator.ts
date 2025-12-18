import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface AuthPayload {
  userId: string;
  sessionId: string;
  claims: Record<string, any>;
}

/**
 * Decorator to extract the current authenticated user from the request
 * Usage: @CurrentUser() user: AuthPayload
 * Or: @CurrentUser('userId') userId: string
 */
export const CurrentUser = createParamDecorator(
  (data: keyof AuthPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const auth = request.auth as AuthPayload;

    if (!auth) {
      return null;
    }

    return data ? auth[data] : auth;
  },
);
