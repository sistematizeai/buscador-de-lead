import { describe, expect, it, vi } from "vitest";
import { ScraperProcessor, type ScraperJobData } from "./scraper.processor";
import type { ScrapedBusiness, ScraperProvider } from "./scraper-provider.interface";

function makeLead(name: string, query: string): ScrapedBusiness {
  return {
    name,
    address: `Rua ${query}, 100`,
    phone: "",
    website: "",
    rating: "N/A",
    hasWebsite: false,
    referenceLink: `https://maps.example/${encodeURIComponent(name)}`,
    source: "Google Maps",
    category: "Pet shop",
  };
}

function makeProcessor(
  provider: ScraperProvider,
  configValues: Record<string, string | undefined> = {},
  leads = { filterNewLeads: vi.fn(async (items: any[]) => items) },
  gosomProvider = { isAvailable: () => false },
) {
  return new ScraperProcessor(
    {} as never,
    leads as never,
    {} as never,
    {} as never,
    {} as never,
    provider as never,
    gosomProvider as never,
    {} as never,
    {} as never,
    { get: (key: string) => configValues[key] } as never,
  );
}

const baseJob: ScraperJobData = {
  campaignId: "campaign-1",
  workspaceId: "workspace-1",
  searchQueries: ["petshops Salvador"],
  industry: "petshops",
  location: "Brasil > Bahia > Salvador",
  maxResults: 20,
  yourService: "catalogo online",
  contentStyle: "balanced",
  language: "portuguese",
  source: "google_maps",
};

describe("ScraperProcessor scrape planning", () => {
  it("returns exactly the requested number when providers return more unique leads", async () => {
    const provider = {
      scrape: vi.fn(async (query: string, maxResults: number) =>
        Array.from({ length: maxResults }, (_, index) => makeLead(`${query} lead ${index}`, query)),
      ),
    };
    const processor = makeProcessor(provider, { SCRAPER_PROVIDER: "playwright" });

    const leads = await (processor as any).scrapeLeads({
      ...baseJob,
      searchQueries: ["petshops Salvador", "banho e tosa Salvador"],
      maxResults: 5,
    });

    expect(leads).toHaveLength(5);
  });

  it("keeps requesting while below the requested amount and new unique leads still appear", async () => {
    let sequence = 0;
    const provider = {
      scrape: vi.fn(async (query: string) =>
        Array.from({ length: 7 }, () => {
          sequence += 1;
          return makeLead(`${query} lead ${sequence}`, query);
        }),
      ),
    };
    const processor = makeProcessor(provider, {
      SCRAPER_PROVIDER: "playwright",
      SCRAPER_MAX_ROUNDS: "10",
    });

    const leads = await (processor as any).scrapeLeads({
      ...baseJob,
      maxResults: 30,
    });

    expect(leads).toHaveLength(30);
    expect(provider.scrape).toHaveBeenCalledTimes(5);
  });

  it("keeps searching when database duplicates are skipped before reaching the requested amount", async () => {
    const provider = {
      scrape: vi
        .fn()
        .mockResolvedValueOnce(Array.from({ length: 5 }, (_, index) => makeLead(`existing lead ${index}`, "petshops")))
        .mockResolvedValueOnce([
          ...Array.from({ length: 5 }, (_, index) => makeLead(`existing lead ${index}`, "petshops")),
          ...Array.from({ length: 3 }, (_, index) => makeLead(`new lead ${index}`, "petshops")),
        ])
        .mockResolvedValueOnce([
          ...Array.from({ length: 5 }, (_, index) => makeLead(`existing lead ${index}`, "petshops")),
          ...Array.from({ length: 5 }, (_, index) => makeLead(`new lead ${index}`, "petshops")),
        ]),
    };
    const leadsService = {
      filterNewLeads: vi.fn(async (items: any[]) =>
        items.filter((lead) => !String(lead.name).startsWith("existing")),
      ),
    };
    const processor = makeProcessor(provider, {
      SCRAPER_PROVIDER: "playwright",
      SCRAPER_MAX_ROUNDS: "5",
    }, leadsService);

    const leads = await (processor as any).scrapeLeads({
      ...baseJob,
      maxResults: 5,
    });

    expect(leads.map((lead: any) => lead.name)).toEqual([
      "new lead 0",
      "new lead 1",
      "new lead 2",
      "new lead 3",
      "new lead 4",
    ]);
    expect(provider.scrape).toHaveBeenCalledTimes(3);
    expect(leadsService.filterNewLeads).toHaveBeenCalledTimes(3);
  });

  it("retries a provider query before giving up on that query", async () => {
    const provider = {
      scrape: vi
        .fn()
        .mockRejectedValueOnce(new Error("bloqueio temporario"))
        .mockRejectedValueOnce(new Error("timeout temporario"))
        .mockResolvedValueOnce(Array.from({ length: 5 }, (_, index) => makeLead(`retry lead ${index}`, "petshops"))),
    };
    const processor = makeProcessor(provider, {
      SCRAPER_PROVIDER: "playwright",
      SCRAPER_QUERY_RETRIES: "2",
    });

    const leads = await (processor as any).scrapeLeads({
      ...baseJob,
      maxResults: 5,
    });

    expect(leads).toHaveLength(5);
    expect(provider.scrape).toHaveBeenCalledTimes(3);
  });

  it("fails fast when Gosom is explicitly configured but unavailable", async () => {
    const provider = {
      scrape: vi.fn(async (query: string, maxResults: number) =>
        Array.from({ length: maxResults }, (_, index) => makeLead(`${query} fallback ${index}`, query)),
      ),
    };
    const processor = makeProcessor(provider, { SCRAPER_PROVIDER: "gosom" }, undefined, {
      isAvailable: () => false,
    });

    await expect((processor as any).scrapeLeads({
      ...baseJob,
      maxResults: 5,
    })).rejects.toThrow("SCRAPER_PROVIDER=gosom");

    expect(provider.scrape).not.toHaveBeenCalled();
  });
});
