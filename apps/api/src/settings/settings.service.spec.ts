import { describe, expect, it, vi } from "vitest";
import { SettingsService } from "./settings.service";

describe("SettingsService", () => {
  it("reports personal runtime status for database, scraper, auth, and AI", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
    };
    const config = {
      get: vi.fn((key: string) => ({
        SCRAPER_PROVIDER: "gosom",
        GOSOM_BINARY_PATH: process.execPath,
        JWT_SECRET: "local-secret-with-more-than-32-chars",
        OPENAI_API_KEY: "",
        OPENAI_MODEL: "gpt-4o-mini",
        NEXT_PUBLIC_APP_URL: "http://localhost:3000",
        NEXT_PUBLIC_API_URL: "http://localhost:3001/api",
      })[key]),
    };

    const service = new SettingsService(prisma as never, config as never);

    await expect(service.getRuntimeStatus()).resolves.toEqual(
      expect.objectContaining({
        database: expect.objectContaining({ ok: true }),
        scraper: expect.objectContaining({ ok: true, provider: "gosom" }),
        auth: expect.objectContaining({ ok: true }),
        ai: expect.objectContaining({ configured: false, model: "gpt-4o-mini" }),
        app: expect.objectContaining({
          appUrl: "http://localhost:3000",
          apiUrl: "http://localhost:3001/api",
        }),
      }),
    );
  });

  it("reports Gosom as unavailable when explicitly configured without a binary", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
    };
    const config = {
      get: vi.fn((key: string) => ({
        SCRAPER_PROVIDER: "gosom",
        GOSOM_BINARY_PATH: "tools/bin/missing-gosom-binary",
        JWT_SECRET: "local-secret-with-more-than-32-chars",
      })[key]),
    };
    const service = new SettingsService(prisma as never, config as never);

    await expect(service.getRuntimeStatus()).resolves.toEqual(
      expect.objectContaining({
        scraper: expect.objectContaining({
          ok: false,
          provider: "gosom",
          effectiveProvider: "unavailable",
        }),
      }),
    );
  });

  it("reports Playwright as the effective provider when auto mode has no Gosom binary", async () => {
    const prisma = {
      $queryRaw: vi.fn().mockResolvedValue([{ ok: 1 }]),
    };
    const config = {
      get: vi.fn((key: string) => ({
        SCRAPER_PROVIDER: "auto",
        GOSOM_BINARY_PATH: "tools/bin/missing-gosom-binary",
        JWT_SECRET: "local-secret-with-more-than-32-chars",
      })[key]),
    };
    const service = new SettingsService(prisma as never, config as never);

    await expect(service.getRuntimeStatus()).resolves.toEqual(
      expect.objectContaining({
        scraper: expect.objectContaining({
          ok: true,
          provider: "auto",
          effectiveProvider: "playwright",
        }),
      }),
    );
  });

  it("does not expose stored provider API keys when listing integrations", async () => {
    const prisma = {
      integration: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "integration-1",
            type: "openai",
            name: "OpenAI",
            enabled: true,
            config: {
              apiKey: "secret-provider-key",
              model: "google/gemini-2.5-flash",
              baseURL: "https://openrouter.ai/api/v1",
            },
          },
        ]),
      },
    };
    const service = new SettingsService(prisma as never, { get: vi.fn() } as never);

    await expect(service.getIntegrations("workspace-1")).resolves.toEqual([
      expect.objectContaining({
        config: {
          configured: true,
          model: "google/gemini-2.5-flash",
          baseURL: "https://openrouter.ai/api/v1",
        },
      }),
    ]);
  });

  it("preserves an existing provider API key when saving settings without a new key", async () => {
    const prisma = {
      integration: {
        findFirst: vi.fn().mockResolvedValue({
          id: "integration-1",
          config: {
            apiKey: "secret-provider-key",
            model: "old-model",
            baseURL: "https://old.example/v1",
          },
        }),
        update: vi.fn().mockResolvedValue({ id: "integration-1" }),
      },
    };
    const service = new SettingsService(prisma as never, { get: vi.fn() } as never);

    await service.upsertIntegration("openai", "OpenAI", {
      apiKey: "",
      model: "new-model",
      baseURL: "https://new.example/v1",
    }, "workspace-1");

    expect(prisma.integration.update).toHaveBeenCalledWith({
      where: { id: "integration-1" },
      data: {
        config: {
          apiKey: "secret-provider-key",
          model: "new-model",
          baseURL: "https://new.example/v1",
        },
        enabled: true,
      },
    });
  });

  it("does not expose provider API keys in the upsert response", async () => {
    const prisma = {
      integration: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({
          id: "integration-1",
          type: "openai",
          name: "OpenAI",
          enabled: true,
          config: {
            apiKey: "new-secret-provider-key",
            model: "google/gemini-2.5-flash",
            baseURL: "https://openrouter.ai/api/v1",
          },
        }),
      },
    };
    const service = new SettingsService(prisma as never, { get: vi.fn() } as never);

    await expect(service.upsertIntegration("openai", "OpenAI", {
      apiKey: "new-secret-provider-key",
      model: "google/gemini-2.5-flash",
      baseURL: "https://openrouter.ai/api/v1",
    }, "workspace-1")).resolves.toEqual(
      expect.objectContaining({
        config: {
          configured: true,
          model: "google/gemini-2.5-flash",
          baseURL: "https://openrouter.ai/api/v1",
        },
      }),
    );

    expect(prisma.integration.create).toHaveBeenCalledWith({
      data: {
        type: "openai",
        name: "OpenAI",
        config: {
          apiKey: "new-secret-provider-key",
          model: "google/gemini-2.5-flash",
          baseURL: "https://openrouter.ai/api/v1",
        },
        workspaceId: "workspace-1",
      },
    });
  });
});
