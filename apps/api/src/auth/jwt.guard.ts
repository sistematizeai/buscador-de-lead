import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { resolvePermissions } from "./permissions";

@Injectable()
export class JwtGuard implements CanActivate {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const req = ctx.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) throw new UnauthorizedException("Missing token");

    const token = authHeader.slice(7);
    try {
      const payload = await this.jwtService.verifyAsync<{
        sub: string;
        workspaceId: string;
        email: string;
        sessionVersion?: number;
      }>(token, {
        secret: this.config.get<string>("JWT_SECRET"),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          sessionVersion: true,
          memberships: {
            where: { workspaceId: payload.workspaceId },
            select: { role: true, workspaceId: true },
            take: 1,
          },
        },
      });
      const membership = user?.memberships[0];
      if (!user || !membership || user.sessionVersion !== (payload.sessionVersion ?? 0)) {
        throw new UnauthorizedException("Invalid or expired token");
      }

      req.user = {
        userId: user.id,
        sub: user.id,
        workspaceId: membership.workspaceId,
        role: membership.role,
        permissions: resolvePermissions(membership.role),
        sessionVersion: user.sessionVersion,
      };
    } catch {
      throw new UnauthorizedException("Invalid or expired token");
    }
    return true;
  }
}
