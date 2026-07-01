import { beforeEach, describe, expect, it, vi } from "vitest";
import { MarketingAiService } from "./marketing-ai.service";

const { createCompletionMock } = vi.hoisted(() => ({
  createCompletionMock: vi.fn(),
}));

vi.mock("openai", () => ({
  default: vi.fn().mockImplementation(() => ({
    chat: {
      completions: {
        create: createCompletionMock,
      },
    },
  })),
}));

function attachWorkspaceMock<T extends Record<string, any>>(prisma: T): T {
  return Object.assign(prisma, {
    withWorkspace: vi.fn((_workspaceId: string, callback: (db: T) => unknown) => callback(prisma)),
  });
}

describe("MarketingAiService", () => {
  beforeEach(() => {
    createCompletionMock.mockReset();
  });

  it("prefers the saved workspace AI integration over environment values", async () => {
    const prisma = attachWorkspaceMock({
      integration: {
        findFirst: vi.fn().mockResolvedValue({
          config: {
            apiKey: "saved-key",
            model: "saved-model",
            baseURL: "https://provider.example/v1",
          },
        }),
      },
    });
    const config = {
      get: vi.fn((key: string) => ({
        OPENAI_API_KEY: "env-key",
        OPENAI_MODEL: "env-model",
        OPENAI_BASE_URL: "https://env.example/v1",
      })[key]),
    };
    const service = new MarketingAiService(config as never, prisma as never);

    await expect(service.resolveProviderConfig("workspace-1")).resolves.toEqual({
      apiKey: "saved-key",
      model: "saved-model",
      baseURL: "https://provider.example/v1",
    });
  });

  it("falls back to environment AI settings when no workspace integration exists", async () => {
    const prisma = attachWorkspaceMock({
      integration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const config = {
      get: vi.fn((key: string) => ({
        OPENAI_API_KEY: "env-key",
        OPENAI_MODEL: "env-model",
        OPENAI_BASE_URL: "",
      })[key]),
    };
    const service = new MarketingAiService(config as never, prisma as never);

    await expect(service.resolveProviderConfig("workspace-1")).resolves.toEqual({
      apiKey: "env-key",
      model: "env-model",
      baseURL: undefined,
    });
  });

  it("generates Portuguese fallback outreach content for Portuguese campaigns", () => {
    const prisma = attachWorkspaceMock({ integration: { findFirst: vi.fn() } });
    const config = { get: vi.fn() };
    const service = new MarketingAiService(config as never, prisma as never);

    const content = service.generateMockContent({
      businessName: "Padaria Central",
      industry: "padaria",
      rating: "4.8",
      hasWebsite: false,
      yourService: "catálogo online",
      contentStyle: "balanced",
      language: "portuguese",
      score: 82,
    });

    expect(content.email.subject).toContain("Padaria Central");
    expect(content.email.body).toContain("catálogo online");
    expect(content.whatsapp).toContain("Olá");
    expect(content.linkedin.connectionNote).toContain("colaboração");
  });

  it("limits completion tokens when calling the configured AI provider", async () => {
    createCompletionMock.mockResolvedValue({
      choices: [{
        message: {
          content: JSON.stringify({
            email: { subject: "Assunto", body: "Corpo" },
            whatsapp: "Mensagem WhatsApp",
            instagram: "Mensagem Instagram",
            linkedin: { connectionNote: "Nota LinkedIn" },
            coldCall: { opening: "Abertura" },
          }),
        },
      }],
    });
    const prisma = attachWorkspaceMock({
      integration: {
        findFirst: vi.fn().mockResolvedValue(null),
      },
    });
    const config = {
      get: vi.fn((key: string) => ({
        OPENAI_API_KEY: "env-key",
        OPENAI_MODEL: "google/gemini-2.5-flash",
        OPENAI_BASE_URL: "https://openrouter.ai/api/v1",
      })[key]),
    };
    const service = new MarketingAiService(config as never, prisma as never);

    await service.generateContent({
      businessName: "Padaria Central",
      industry: "padaria",
      rating: "4.8",
      hasWebsite: false,
      yourService: "catÃ¡logo online",
      contentStyle: "balanced",
      language: "portuguese",
      score: 82,
    });

    expect(createCompletionMock.mock.calls[0][0]).toEqual(expect.objectContaining({
      max_tokens: 1000,
    }));
  });
});
