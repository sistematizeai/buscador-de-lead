import { describe, expect, it, vi } from "vitest";
import { PrismaService } from "./prisma.service";

describe("PrismaService RLS workspace context", () => {
  it("sets app.workspace_id locally inside a transaction", async () => {
    const prisma = new PrismaService();
    const transaction = vi.fn();
    const executeRaw = vi.fn();
    const callback = vi.fn().mockResolvedValue("ok");
    const tx = { $executeRaw: executeRaw };

    transaction.mockImplementation(async (handler: (client: typeof tx) => Promise<unknown>) => handler(tx));
    vi.spyOn(prisma, "$transaction").mockImplementation(transaction as never);

    await expect(prisma.withWorkspace("workspace-1", callback)).resolves.toBe("ok");

    expect(transaction).toHaveBeenCalledTimes(1);
    expect(executeRaw).toHaveBeenCalledTimes(1);
    expect(String(executeRaw.mock.calls[0][0])).toContain("set_config");
    expect(callback).toHaveBeenCalledWith(tx);
  });

  it("rejects an empty workspace context", async () => {
    const prisma = new PrismaService();

    await expect(prisma.withWorkspace(" ", async () => "never")).rejects.toThrow("workspaceId");
  });
});
