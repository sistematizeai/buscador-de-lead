import { createHash, randomBytes } from "crypto";
import { existsSync } from "node:fs";
import { Injectable, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { resolveGosomBinaryPath } from "../scraper/providers/gosom-google-maps.provider";
import { EncryptionUtil } from "../security/encryption.util";

const DEFAULT_WORKSPACE_ID = "default-workspace";

@Injectable()
export class SettingsService {
  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {}

  async getRuntimeStatus(workspaceId?: string) {
    const provider = (this.config.get<string>("SCRAPER_PROVIDER") || "auto").toLowerCase();
    const gosomBinaryPath = resolveGosomBinaryPath(this.config.get<string>("GOSOM_BINARY_PATH"));
    const gosomAvailable = existsSync(gosomBinaryPath);
    const scraperStatus = this.getScraperStatus(provider, gosomAvailable, gosomBinaryPath);
    const envOpenAiKey = this.config.get<string>("OPENAI_API_KEY") || "";
    const envOpenAiModel = this.config.get<string>("OPENAI_MODEL") || "gpt-4o-mini";
    const jwtSecret = this.config.get<string>("JWT_SECRET") || "";
    const savedOpenAi = workspaceId
      ? await this.prisma.withWorkspace(workspaceId, (db) =>
          db.integration.findFirst({ where: { workspaceId, type: "openai", enabled: true } }),
        )
      : null;
    const savedOpenAiConfig = EncryptionUtil.decryptConfig(savedOpenAi?.config as Record<string, string> | undefined);
    const effectiveOpenAiKey = savedOpenAiConfig?.apiKey || envOpenAiKey;
    const effectiveOpenAiModel = savedOpenAiConfig?.model || envOpenAiModel;

    let databaseOk = false;
    let databaseMessage = "Falha na conexao com o banco";
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
      databaseMessage = "Conectado";
    } catch (error) {
      databaseMessage = String(error);
    }

    return {
      database: {
        ok: databaseOk,
        message: databaseMessage,
      },
      scraper: scraperStatus,
      auth: {
        ok: jwtSecret.length >= 32,
        message: jwtSecret.length >= 32 ? "Segredo JWT configurado" : "Segredo JWT ausente ou muito curto",
      },
      ai: {
        configured: effectiveOpenAiKey.trim().length > 0,
        source: savedOpenAiConfig?.apiKey ? "settings" : "environment",
        model: effectiveOpenAiModel,
        baseURL: savedOpenAiConfig?.baseURL || this.config.get<string>("OPENAI_BASE_URL") || null,
        message: effectiveOpenAiKey.trim().length > 0 ? "Chave de IA configurada" : "Usando fallback local por template",
      },
      search: {
        braveSearchConfigured: Boolean(
          (this.config.get<string>("BRAVE_SEARCH_API_KEY") || this.config.get<string>("BRAVE_API_KEY") || "").trim(),
        ),
        message: (this.config.get<string>("BRAVE_SEARCH_API_KEY") || this.config.get<string>("BRAVE_API_KEY") || "").trim()
          ? "Brave Search API configurada para fontes sociais"
          : "Fontes sociais usando fallback publico sujeito a bloqueios de buscadores",
      },
      app: {
        appUrl: this.config.get<string>("NEXT_PUBLIC_APP_URL") || "http://localhost:3000",
        apiUrl: this.config.get<string>("NEXT_PUBLIC_API_URL") || "http://localhost:3001/api",
      },
    };
  }

  async getIntegrations(workspaceId = DEFAULT_WORKSPACE_ID) {
    const integrations = await this.prisma.withWorkspace(workspaceId, (db) =>
      db.integration.findMany({ where: { workspaceId } }),
    );
    return integrations.map((integration) => {
      const decryptedConfig = EncryptionUtil.decryptConfig(integration.config as Record<string, string> | null);
      return {
        ...integration,
        config: this.sanitizeIntegrationConfig(decryptedConfig),
      };
    });
  }

  async upsertIntegration(
    type: string,
    name: string,
    config: Record<string, string>,
    workspaceId = DEFAULT_WORKSPACE_ID,
  ) {
    return this.prisma.withWorkspace(workspaceId, async (db) => {
      const existing = await db.integration.findFirst({ where: { workspaceId, type } });
      const decryptedExisting = EncryptionUtil.decryptConfig(existing?.config as Record<string, string> | undefined);
      const nextConfig = this.mergePrivateIntegrationConfig(
        decryptedExisting,
        config,
      );
      const encryptedConfig = EncryptionUtil.encryptConfig(nextConfig);

      if (existing) {
        const integration = await db.integration.update({
          where: { id: existing.id },
          data: { config: encryptedConfig, enabled: true },
        });
        const decryptedIntegration = { ...integration, config: nextConfig };
        return this.sanitizeIntegration(decryptedIntegration);
      }
      const integration = await db.integration.create({ data: { type, name, config: encryptedConfig, workspaceId } });
      const decryptedIntegration = { ...integration, config: nextConfig };
      return this.sanitizeIntegration(decryptedIntegration);
    });
  }

  async listApiKeys(workspaceId = DEFAULT_WORKSPACE_ID) {
    return this.prisma.withWorkspace(workspaceId, (db) =>
      db.apiKey.findMany({
        where: { workspaceId },
        select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      }),
    );
  }

  async createApiKey(name: string, workspaceId = DEFAULT_WORKSPACE_ID) {
    const key = `px_${randomBytes(32).toString("base64url")}`;
    const apiKey = await this.prisma.withWorkspace(workspaceId, (db) =>
      db.apiKey.create({
        data: { name, key: this.hashApiKey(key), workspaceId },
        select: { id: true, name: true, lastUsedAt: true, expiresAt: true, createdAt: true },
      }),
    );
    return { ...apiKey, key };
  }

  async deleteApiKey(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
    const deleted = await this.prisma.withWorkspace(workspaceId, (db) =>
      db.apiKey.deleteMany({ where: { id, workspaceId } }),
    );
    if (deleted.count !== 1) throw new NotFoundException("Chave de API nao encontrada");
    return { id };
  }

  private sanitizeIntegrationConfig(config?: Record<string, string> | null) {
    const safeConfig: Record<string, string | boolean> = {};

    for (const [key, value] of Object.entries(config ?? {})) {
      if (this.isPrivateConfigKey(key)) {
        safeConfig.configured = Boolean(value?.trim());
        continue;
      }
      safeConfig[key] = value;
    }

    return safeConfig;
  }

  private sanitizeIntegration<T extends { config: unknown }>(integration: T) {
    return {
      ...integration,
      config: this.sanitizeIntegrationConfig(integration.config as Record<string, string> | null),
    };
  }

  private mergePrivateIntegrationConfig(
    existingConfig: Record<string, string> | undefined,
    nextConfig: Record<string, string>,
  ) {
    const merged = { ...nextConfig };

    for (const key of Object.keys(merged)) {
      if (this.isPrivateConfigKey(key) && !merged[key]?.trim()) {
        if (existingConfig?.[key]) {
          merged[key] = existingConfig[key];
        } else {
          delete merged[key];
        }
      }
    }

    return merged;
  }

  private isPrivateConfigKey(key: string) {
    return /apiKey|api_key|key|secret|token|password/i.test(key);
  }

  private hashApiKey(key: string) {
    return `sha256:${createHash("sha256").update(key).digest("hex")}`;
  }

  private getScraperStatus(provider: string, gosomAvailable: boolean, gosomBinaryPath: string) {
    if (provider === "gosom") {
      return {
        ok: gosomAvailable,
        provider,
        effectiveProvider: gosomAvailable ? "gosom" : "unavailable",
        binaryPath: gosomBinaryPath,
        message: gosomAvailable
          ? "Binario do Gosom encontrado"
          : "SCRAPER_PROVIDER=gosom exige o binario do Gosom, mas ele nao foi encontrado",
      };
    }

    if (provider === "playwright") {
      return {
        ok: true,
        provider,
        effectiveProvider: "playwright",
        binaryPath: gosomBinaryPath,
        message: "Playwright configurado como motor de busca",
      };
    }

    if (provider === "auto") {
      return {
        ok: true,
        provider,
        effectiveProvider: gosomAvailable ? "gosom" : "playwright",
        binaryPath: gosomBinaryPath,
        message: gosomAvailable
          ? "Modo auto usando Gosom"
          : "Modo auto usando fallback Playwright porque o binario do Gosom nao foi encontrado",
      };
    }

    return {
      ok: false,
      provider,
      effectiveProvider: "invalid",
      binaryPath: gosomBinaryPath,
      message: `SCRAPER_PROVIDER invalido: ${provider}`,
    };
  }
}
