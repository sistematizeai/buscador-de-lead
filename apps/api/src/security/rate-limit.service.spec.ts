import { HttpStatus } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { RateLimitService } from "./rate-limit.service";

function makePrisma() {
  const prisma = {
    $queryRaw: vi.fn(),
  };
  return Object.assign(prisma, {
    withWorkspace: vi.fn((_workspaceId: string, callback: (db: typeof prisma) => unknown) => callback(prisma)),
  });
}

function makeAudit() {
  return {
    record: vi.fn().mockResolvedValue(undefined),
  };
}

describe("RateLimitService", () => {
  beforeEach(() => {
    vi.useRealTimers();
  });

  it("stores rate limit buckets in the database using action, scope, and window", async () => {
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    const prisma = makePrisma();
    prisma.$queryRaw.mockResolvedValue([{
      key: "login:ip:127.0.0.1",
      count: 1,
      resetAt: new Date("2026-07-01T00:15:00.000Z"),
    }]);
    const service = new RateLimitService(prisma as never, makeAudit() as never);

    await service.assertAllowed({
      key: "login:ip:127.0.0.1",
      action: "login",
      scope: "ip",
      limit: 5,
      windowMs: 15 * 60 * 1000,
      ipAddress: "127.0.0.1",
    });

    expect(prisma.$queryRaw).toHaveBeenCalledOnce();
  });

  it("returns HTTP 429 and audits when a persisted bucket is over limit", async () => {
    vi.setSystemTime(new Date("2026-07-01T00:00:00.000Z"));
    const prisma = makePrisma();
    const audit = makeAudit();
    prisma.$queryRaw.mockResolvedValue([{
      key: "export:user:user-1",
      count: 6,
      resetAt: new Date("2026-07-01T01:00:00.000Z"),
    }]);
    const service = new RateLimitService(prisma as never, audit as never);

    await expect(
      service.assertAllowed({
        key: "export:user:user-1",
        action: "crm.export",
        scope: "user",
        limit: 5,
        windowMs: 60 * 60 * 1000,
        userId: "user-1",
        workspaceId: "workspace-1",
      }),
    ).rejects.toMatchObject({
      status: HttpStatus.TOO_MANY_REQUESTS,
    });

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "rate_limit_exceeded",
      outcome: "denied",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: expect.objectContaining({
        action: "crm.export",
        scope: "user",
        limit: 5,
      }),
    }));
  });
});
