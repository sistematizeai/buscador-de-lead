import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { SecurityAuditService } from "../security/security-audit.service";
import { REQUIRED_PERMISSIONS_KEY, type Permission } from "./permissions";

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(
    private reflector: Reflector,
    private audit: SecurityAuditService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const required = this.reflector.getAllAndOverride<Permission[]>(REQUIRED_PERMISSIONS_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (!required?.length) return true;

    const req = ctx.switchToHttp().getRequest();
    const currentPermissions = new Set(req.user?.permissions ?? []);
    const allowed = required.every((permission) => currentPermissions.has(permission));
    if (!allowed) {
      await this.audit.record({
        event: "access_denied",
        outcome: "denied",
        userId: req.user?.userId,
        workspaceId: req.user?.workspaceId,
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"],
        metadata: {
          required,
          path: req.originalUrl || req.url,
          method: req.method,
        },
      });
      throw new ForbiddenException("Permissao insuficiente");
    }

    return true;
  }
}
