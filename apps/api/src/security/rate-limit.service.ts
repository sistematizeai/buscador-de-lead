import { HttpException, HttpStatus, Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { SecurityAuditService } from "./security-audit.service";

export interface RateLimitRule {
  key: string;
  action: string;
  scope: "ip" | "user" | "workspace" | "email" | "api_key" | "endpoint" | "tenant" | "action";
  limit: number;
  windowMs: number;
  workspaceId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  endpoint?: string | null;
  message?: string;
}

interface PersistedBucket {
  count: number;
  resetAt: Date;
}

@Injectable()
export class RateLimitService {
  constructor(
    private prisma: PrismaService,
    private audit: SecurityAuditService,
  ) {}

  async assertAllowed(rule: RateLimitRule) {
    const now = new Date();
    const nextResetAt = new Date(now.getTime() + rule.windowMs);
    const [bucket] = await this.prisma.$queryRaw<PersistedBucket[]>`
      INSERT INTO security_rate_limit_buckets
        (
          "key",
          "action",
          "scope",
          "limit",
          "count",
          "window_ms",
          "reset_at",
          "workspace_id",
          "user_id",
          "endpoint",
          "created_at",
          "updated_at"
        )
      VALUES
        (
          ${rule.key},
          ${rule.action},
          ${rule.scope},
          ${rule.limit},
          1,
          ${rule.windowMs},
          ${nextResetAt},
          ${rule.workspaceId ?? null},
          ${rule.userId ?? null},
          ${rule.endpoint ?? null},
          ${now},
          ${now}
        )
      ON CONFLICT ("key") DO UPDATE SET
        "action" = EXCLUDED."action",
        "scope" = EXCLUDED."scope",
        "limit" = EXCLUDED."limit",
        "window_ms" = EXCLUDED."window_ms",
        "workspace_id" = EXCLUDED."workspace_id",
        "user_id" = EXCLUDED."user_id",
        "endpoint" = EXCLUDED."endpoint",
        "count" = CASE
          WHEN security_rate_limit_buckets."reset_at" <= ${now} THEN 1
          ELSE security_rate_limit_buckets."count" + 1
        END,
        "reset_at" = CASE
          WHEN security_rate_limit_buckets."reset_at" <= ${now} THEN ${nextResetAt}
          ELSE security_rate_limit_buckets."reset_at"
        END,
        "updated_at" = ${now}
      RETURNING "count", "reset_at" AS "resetAt"
    `;

    if (!bucket || bucket.count <= rule.limit) {
      return;
    }

    const retryAfterSeconds = Math.max(1, Math.ceil((new Date(bucket.resetAt).getTime() - now.getTime()) / 1000));
    await this.audit.record({
      event: "rate_limit_exceeded",
      outcome: "denied",
      workspaceId: rule.workspaceId,
      userId: rule.userId,
      ipAddress: rule.ipAddress,
      userAgent: rule.userAgent,
      metadata: {
        action: rule.action,
        scope: rule.scope,
        limit: rule.limit,
        count: bucket.count,
        endpoint: rule.endpoint,
        retryAfterSeconds,
      } satisfies Prisma.InputJsonObject,
    });

    throw new HttpException(
      {
        message: rule.message ?? "Muitas tentativas. Aguarde e tente novamente.",
        retryAfterSeconds,
      },
      HttpStatus.TOO_MANY_REQUESTS,
    );
  }
}
