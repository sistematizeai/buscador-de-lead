import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

export type WorkspaceTransactionClient = Prisma.TransactionClient;

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }

  async withWorkspace<T>(
    workspaceId: string,
    callback: (client: WorkspaceTransactionClient) => Promise<T>,
  ): Promise<T> {
    const safeWorkspaceId = workspaceId.trim();
    if (!safeWorkspaceId) throw new Error("workspaceId is required for tenant-scoped database access");

    return this.$transaction(async (client) => {
      await client.$executeRaw`SELECT set_config('app.workspace_id', ${safeWorkspaceId}, true)`;
      return callback(client);
    });
  }
}
