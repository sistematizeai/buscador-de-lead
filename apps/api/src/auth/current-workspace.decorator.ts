import { createParamDecorator, ExecutionContext, UnauthorizedException } from "@nestjs/common";

export const WorkspaceId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string => {
    const req = ctx.switchToHttp().getRequest();
    const workspaceId = req.user?.workspaceId;
    if (!workspaceId) throw new UnauthorizedException("Workspace ausente no contexto seguro");
    return workspaceId;
  },
);
