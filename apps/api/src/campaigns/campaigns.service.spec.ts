import { describe, expect, it, vi } from "vitest";
import { CampaignsService } from "./campaigns.service";

describe("CampaignsService", () => {
  it("stores a precise region and strict search queries without leaking regionConfig to Prisma", async () => {
    const prisma = {
      workspace: { upsert: vi.fn().mockResolvedValue({}) },
      campaign: { create: vi.fn().mockResolvedValue({ id: "campaign-1" }) },
    };
    const service = new CampaignsService(prisma as never);

    await service.create({
      name: "Catálogo Salvador",
      industry: "restaurant",
      location: "",
      regionConfig: {
        country: "Brasil",
        state: "Bahia",
        city: "Salvador",
        district: "Nazaré",
        street: "Rua do Salete",
      },
      searchQueries: ["pizzarias"],
      yourService: "catálogo online",
      maxResults: 20,
      contentStyle: "balanced",
      language: "portuguese",
      sources: ["google_maps", "instagram"],
    });

    expect(prisma.campaign.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        source: "google_maps,instagram",
        location: "Brasil > Bahia > Salvador > Nazaré > Rua do Salete",
        searchQueries: [
          "Restaurantes e alimentação pizzarias sem site Brasil Bahia Salvador Nazaré Rua do Salete",
          "Restaurantes e alimentação pizzarias sem catálogo online Brasil Bahia Salvador Nazaré Rua do Salete",
        ],
      }),
    });
    expect(prisma.campaign.create.mock.calls[0][0].data).not.toHaveProperty("regionConfig");
    expect(prisma.campaign.create.mock.calls[0][0].data).not.toHaveProperty("sources");
  });

  it("updates campaigns using id and workspace together", async () => {
    const prisma = {
      campaign: {
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
        findFirst: vi.fn().mockResolvedValue({ id: "campaign-1", workspaceId: "workspace-1" }),
      },
    };
    const service = new CampaignsService(prisma as never);

    await service.update("campaign-1", { name: "Campanha segura" }, "workspace-1");

    expect(prisma.campaign.updateMany).toHaveBeenCalledWith({
      where: { id: "campaign-1", workspaceId: "workspace-1" },
      data: { name: "Campanha segura" },
    });
  });

  it("deletes campaigns using id and workspace together", async () => {
    const prisma = {
      campaign: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new CampaignsService(prisma as never);

    await service.remove("campaign-1", "workspace-1");

    expect(prisma.campaign.deleteMany).toHaveBeenCalledWith({
      where: { id: "campaign-1", workspaceId: "workspace-1" },
    });
  });
});
