export interface AuthPayload {
    userId: string;
    sessionId: string;
    claims: Record<string, any>;
}
export declare const CurrentUser: (...dataOrPipes: (keyof AuthPayload | import("@nestjs/common").PipeTransform<any, any> | import("@nestjs/common").Type<import("@nestjs/common").PipeTransform<any, any>> | undefined)[]) => ParameterDecorator;
