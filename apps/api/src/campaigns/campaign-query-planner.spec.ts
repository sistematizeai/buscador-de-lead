import { describe, expect, it } from "vitest";
import { buildCampaignSearchQueries, buildRegionLabel, normalizeCampaignSources } from "./campaign-query-planner";

describe("campaign-query-planner", () => {
  it("builds a precise hierarchical region label", () => {
    expect(
      buildRegionLabel({
        country: "Brasil",
        state: "Bahia",
        city: "Salvador",
        district: "Nazaré",
        street: "Rua do Salete",
      }),
    ).toBe("Brasil > Bahia > Salvador > Nazaré > Rua do Salete");
  });

  it("generates strict queries that always include niche and region", () => {
    const queries = buildCampaignSearchQueries({
      industry: "Restaurantes e alimentação",
      location: "Brasil > Bahia > Salvador > Rua do Salete",
      searchQueries: ["pizzarias", "self service salvador"],
    });

    expect(queries).toEqual([
      "Restaurantes e alimentação pizzarias Brasil Bahia Salvador Rua do Salete",
      "Restaurantes e alimentação self service salvador Brasil Bahia Salvador Rua do Salete",
    ]);
  });

  it("creates catalogue opportunity queries when no manual query is supplied", () => {
    const queries = buildCampaignSearchQueries({
      industry: "Clínicas de estética",
      location: "Brasil > São Paulo > Campinas > Cambuí",
      searchQueries: [],
    });

    expect(queries).toEqual([
      "Clínicas de estética Brasil São Paulo Campinas Cambuí",
      "Clínicas de estética sem site Brasil São Paulo Campinas Cambuí",
      "Clínicas de estética sem catálogo online Brasil São Paulo Campinas Cambuí",
      "Clínicas de estética perto de Brasil São Paulo Campinas Cambuí",
    ]);
  });

  it("adds missing-website intent to every query when that target mode is enabled", () => {
    const queries = buildCampaignSearchQueries({
      industry: "restaurant",
      location: "Brasil > Bahia > Salvador",
      searchQueries: ["pizzarias"],
      targetWebsiteMode: "missing_website",
    });

    expect(queries).toEqual([
      "Restaurantes e alimentação pizzarias sem site Brasil Bahia Salvador",
      "Restaurantes e alimentação pizzarias sem catálogo online Brasil Bahia Salvador",
    ]);
  });

  it("maps petshop niche to a commercial pet shop search term", () => {
    const queries = buildCampaignSearchQueries({
      industry: "petshop",
      location: "Brasil > Bahia > Salvador",
      searchQueries: ["banho e tosa"],
      targetWebsiteMode: "missing_website",
    });

    expect(queries).toEqual([
      "Pet shops e banho e tosa banho e tosa sem site Brasil Bahia Salvador",
      "Pet shops e banho e tosa banho e tosa sem catálogo online Brasil Bahia Salvador",
    ]);
  });

  it("normalizes multiple selected campaign sources without duplicates", () => {
    expect(normalizeCampaignSources(["instagram", "google_maps", "instagram", "facebook_marketplace"])).toEqual([
      "instagram",
      "google_maps",
      "facebook_marketplace",
    ]);
  });

  it("supports persisted comma-separated campaign sources", () => {
    expect(normalizeCampaignSources("google_maps,instagram,unknown")).toEqual(["google_maps", "instagram"]);
  });

  it("falls back to Google Maps when no valid source is supplied", () => {
    expect(normalizeCampaignSources(["unknown"])).toEqual(["google_maps"]);
  });
});
