import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import * as bcrypt from "bcryptjs";
import { AuthService } from "./auth.service";

function makeService(prismaOverrides: Record<string, any> = {}, configValues: Record<string, string> = {}) {
  const prisma = {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    account: {
      findFirst: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    passwordResetToken: {
      updateMany: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    session: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (items: unknown[]) => items),
    ...prismaOverrides,
  };
  const service = new AuthService(
    prisma as never,
    { sign: vi.fn().mockReturnValue("jwt-token") } as never,
    { get: vi.fn((key: string) => configValues[key]) } as never,
    { assertAllowed: vi.fn() } as never,
    { record: vi.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, prisma };
}

describe("AuthService password reset", () => {
  it("returns a neutral message when the e-mail does not exist", async () => {
    const { service, prisma } = makeService({
      user: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    const response = await service.requestPasswordReset(
      { email: "naoexiste@empresa.com" },
      { ipAddress: "127.0.0.1", userAgent: "vitest" },
    );

    expect(response.message).toContain("Se existir uma conta");
    expect(response).not.toHaveProperty("devResetUrl");
    expect(prisma.passwordResetToken.create).not.toHaveBeenCalled();
  });

  it("stores only a hash of the reset token and does not expose it in production", async () => {
    const create = vi.fn().mockReturnValue({ op: "create" });
    const updateMany = vi.fn().mockReturnValue({ op: "updateMany" });
    const { service } = makeService({
      user: {
        findUnique: vi.fn().mockResolvedValue({
          id: "user-1",
          email: "user@empresa.com",
          memberships: [{ workspaceId: "workspace-1" }],
        }),
      },
      passwordResetToken: { create, updateMany },
    }, {
      NODE_ENV: "production",
      NEXT_PUBLIC_APP_URL: "https://app.example.com",
    });

    const response = await service.requestPasswordReset(
      { email: "USER@empresa.com" },
      { ipAddress: "127.0.0.1", userAgent: "vitest" },
    );

    expect(response).not.toHaveProperty("devResetUrl");
    expect(create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        userId: "user-1",
        tokenHash: expect.stringMatching(/^[a-f0-9]{64}$/),
      }),
    });
  });

  it("rejects invalid, expired, or used tokens", async () => {
    const { service } = makeService({
      passwordResetToken: { findUnique: vi.fn().mockResolvedValue(null) },
    });

    await expect(service.resetPassword(
      { token: "bad-token", password: "SenhaForte!123" },
      { ipAddress: "127.0.0.1", userAgent: "vitest" },
    )).rejects.toBeInstanceOf(BadRequestException);
  });

  it("updates password, marks token as used, increments sessionVersion, and deletes old sessions", async () => {
    const oldHash = await bcrypt.hash("SenhaAntiga!123", 4);
    const accountUpdate = vi.fn().mockReturnValue({ op: "accountUpdate" });
    const tokenUpdate = vi.fn().mockReturnValue({ op: "tokenUpdate" });
    const userUpdate = vi.fn().mockReturnValue({ op: "userUpdate" });
    const sessionDelete = vi.fn().mockReturnValue({ op: "sessionDelete" });
    const { service } = makeService({
      passwordResetToken: {
        findUnique: vi.fn().mockResolvedValue({
          id: "token-1",
          userId: "user-1",
          usedAt: null,
          expiresAt: new Date(Date.now() + 60_000),
          user: {
            email: "user@empresa.com",
            memberships: [{ workspaceId: "workspace-1" }],
          },
        }),
        update: tokenUpdate,
      },
      account: {
        findFirst: vi.fn().mockResolvedValue({ id: "account-1", password: oldHash }),
        update: accountUpdate,
      },
      user: { update: userUpdate },
      session: { deleteMany: sessionDelete },
    });

    const response = await service.resetPassword(
      { token: "valid-token", password: "SenhaNova!123" },
      { ipAddress: "127.0.0.1", userAgent: "vitest" },
    );

    expect(response.message).toContain("Senha redefinida com sucesso");
    expect(accountUpdate).toHaveBeenCalledWith({
      where: { id: "account-1" },
      data: { password: expect.any(String) },
    });
    expect(tokenUpdate).toHaveBeenCalledWith({
      where: { id: "token-1" },
      data: { usedAt: expect.any(Date) },
    });
    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { sessionVersion: { increment: 1 } },
    });
    expect(sessionDelete).toHaveBeenCalledWith({ where: { userId: "user-1" } });
  });
});
