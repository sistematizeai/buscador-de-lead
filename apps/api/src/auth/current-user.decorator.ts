import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";

export interface SecurityContext {
  userId: string;
  workspaceId: string;
  role: string;
  permissions: string[];
  sessionVersion: number;
}

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): SecurityContext => {
    const req = ctx.switchToHttp().getRequest();
    const context = req.user as SecurityContext | undefined;
    if (!context?.userId || !context.workspaceId) {
      throw new UnauthorizedException("Contexto seguro ausente");
    }
    return context;
  },
);

export const CurrentUserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const userId = req.user?.userId;
    if (!userId) throw new UnauthorizedException("Usuário ausente no contexto seguro");
    return userId;
  },
);
