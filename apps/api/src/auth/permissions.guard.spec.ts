import { ForbiddenException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { describe, expect, it, vi } from "vitest";
import { PermissionsGuard } from "./permissions.guard";

function makeHttpContext(user: Record<string, unknown>) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user,
        ip: "127.0.0.1",
        headers: { "user-agent": "vitest" },
        method: "POST",
        originalUrl: "/settings/api-keys",
      }),
    }),
  };
}

describe("PermissionsGuard", () => {
  it("denies users without the required backend permission and audits the attempt", async () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue(["settings.manage_api_keys"]),
    } as unknown as Reflector;
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const guard = new PermissionsGuard(reflector, audit as never);

    await expect(
      guard.canActivate(makeHttpContext({
        userId: "user-1",
        workspaceId: "workspace-1",
        permissions: ["crm.read"],
      }) as never),
    ).rejects.toBeInstanceOf(ForbiddenException);

    expect(audit.record).toHaveBeenCalledWith(expect.objectContaining({
      event: "access_denied",
      outcome: "denied",
      userId: "user-1",
      workspaceId: "workspace-1",
      metadata: expect.objectContaining({
        required: ["settings.manage_api_keys"],
        method: "POST",
        path: "/settings/api-keys",
      }),
    }));
  });
});
