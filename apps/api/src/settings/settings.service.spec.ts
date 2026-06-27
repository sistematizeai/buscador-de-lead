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
});
