import { Injectable, Logger } from "@nestjs/common";
import type { Prisma } from "@prisma/client";
import { PrismaService } from "../prisma/prisma.service";

export interface AuditEventInput {
  event: string;
  outcome?: "success" | "denied" | "failed";
  workspaceId?: string | null;
  userId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  requestId?: string | null;
  metadata?: Record<string, unknown>;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(private prisma: PrismaService) {}

  async record(input: AuditEventInput) {
    try {
      await this.prisma.securityAuditLog.create({
        data: {
          event: input.event,
          outcome: input.outcome ?? "success",
          workspaceId: input.workspaceId || undefined,
          userId: input.userId || undefined,
          ipAddress: input.ipAddress || undefined,
          userAgent: input.userAgent || undefined,
          requestId: input.requestId || undefined,
          metadata: input.metadata as Prisma.InputJsonValue | undefined,
        },
      });
    } catch (error) {
      this.logger.warn(`Falha ao registrar auditoria ${input.event}: ${error}`);
    }
  }
}
