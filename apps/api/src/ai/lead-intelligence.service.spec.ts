import { describe, expect, it } from "vitest";
import { LeadIntelligenceService } from "./lead-intelligence.service";

describe("LeadIntelligenceService", () => {
  it("prioritizes businesses without a website for online catalogue sales", () => {
    const service = new LeadIntelligenceService();
    const baseLead = {
      name: "Restaurante Modelo",
      address: "Rua do Salete, Salvador, Bahia",
      phone: "+55 71 99999-0000",
      rating: "4.6",
      industry: "restaurant",
    };

    const withoutSite = service.scoreLead({ ...baseLead, hasWebsite: false, website: "" }, "restaurant");
    const withSite = service.scoreLead({ ...baseLead, hasWebsite: true, website: "https://restaurante.example" }, "restaurant");

    expect(withoutSite.score).toBeGreaterThan(withSite.score);
    expect(withoutSite.catalogOpportunity.level).toBe("HIGH");
    expect(withoutSite.catalogOpportunity.reasons).toContain("Não possui site publicado");
  });
});
