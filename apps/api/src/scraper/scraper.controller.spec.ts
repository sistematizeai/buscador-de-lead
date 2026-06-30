import { describe, expect, it, vi } from "vitest";
import { ScraperController } from "./scraper.controller";

const campaign = {
  id: "campaign-1",
  workspaceId: "workspace-1",
  searchQueries: ["pet shop Salvador"],
  industry: "petshop",
  location: "Brasil > Bahia > Salvador",
  maxResults: 20,
  yourService: "catalogo online",
  contentStyle: "balanced",
  language: "portuguese",
  source: "google_maps",
};

describe("ScraperController", () => {
  it("retries a campaign in the current workspace with the existing campaign parameters", async () => {
    const processor = { process: vi.fn().mockResolvedValue(undefined) };
    const campaigns = { findOne: vi.fn().mockResolvedValue(campaign) };
    const controller = new ScraperController(processor as never, campaigns as never);

    const result = await controller.retryCampaign("campaign-1", "workspace-1");

    expect(campaigns.findOne).toHaveBeenCalledWith("campaign-1", "workspace-1");
    expect(processor.process).toHaveBeenCalledWith({
      campaignId: campaign.id,
      workspaceId: campaign.workspaceId,
      searchQueries: campaign.searchQueries,
      industry: campaign.industry,
      location: campaign.location,
      maxResults: campaign.maxResults,
      yourService: campaign.yourService,
      contentStyle: campaign.contentStyle,
      language: campaign.language,
      source: campaign.source,
    });
    expect(result).toEqual({ message: "Campanha reenviada para busca", campaignId: "campaign-1" });
  });
});
