import { describe, expect, it, vi } from "vitest";
import { LeadsService } from "./leads.service";

describe("LeadsService duplicate protection", () => {
  it("does not create leads that already exist in the same workspace", async () => {
    const prisma = {
      lead: {
        findMany: vi.fn().mockResolvedValue([
          {
            name: "Barris Store",
            address: "Rua Conselheiro Junqueira Ayres, Salvador",
            phone: "(71) 98353-5867",
            website: null,
            instagramUrl: "https://www.instagram.com/barrisstore",
            referenceUrl: "https://maps.example/barris",
          },
        ]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new LeadsService(prisma as never);

    await service.createMany([
      {
        name: "Barris Store",
        address: "Rua Conselheiro Junqueira Ayres, Salvador",
        phone: "(71) 98353-5867",
        instagramUrl: "https://instagram.com/barrisstore/",
        referenceUrl: "https://maps.example/barris",
        campaignId: "campaign-1",
        workspaceId: "workspace-1",
      },
      {
        name: "Pet Feliz",
        address: "Av. Brasil, Salvador",
        phone: "(71) 90000-1111",
        campaignId: "campaign-1",
        workspaceId: "workspace-1",
      },
    ]);

    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workspaceId: "workspace-1" }),
    }));
    expect(prisma.lead.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: "Pet Feliz",
          address: "Av. Brasil, Salvador",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("deduplicates repeated leads inside the same import batch", async () => {
    const prisma = {
      lead: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new LeadsService(prisma as never);

    await service.createMany([
      {
        name: "Pet Feliz",
        address: "Av. Brasil, Salvador",
        phone: "(71) 90000-1111",
        campaignId: "campaign-1",
        workspaceId: "workspace-1",
      },
      {
        name: " pet feliz ",
        address: "Av Brasil Salvador",
        phone: "71900001111",
        campaignId: "campaign-1",
        workspaceId: "workspace-1",
      },
    ]);

    expect(prisma.lead.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: "Pet Feliz",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("writes a deterministic database dedupe key when creating leads", async () => {
    const prisma = {
      lead: {
        findMany: vi.fn().mockResolvedValue([]),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new LeadsService(prisma as never);

    await service.createMany([
      {
        name: "Pet Feliz",
        address: "Av. Brasil, Salvador",
        phone: "(71) 90000-1111",
        website: "https://www.petfeliz.com.br/",
        campaignId: "campaign-1",
        workspaceId: "workspace-1",
      },
    ]);

    expect(prisma.lead.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: "Pet Feliz",
          dedupeKey: "site:petfeliz.com.br",
        }),
      ],
      skipDuplicates: true,
    });
  });

  it("checks existing duplicate leads inside each workspace represented in the batch", async () => {
    const prisma = {
      lead: {
        findMany: vi.fn(async ({ where }: any) => {
          if (where.workspaceId === "workspace-1") {
            return [
              {
                name: "Barris Store",
                address: "Rua Conselheiro Junqueira Ayres, Salvador",
                phone: "(71) 98353-5867",
                website: null,
                instagramUrl: null,
                referenceUrl: "https://maps.example/barris",
                dedupeKey: null,
              },
            ];
          }

          if (where.workspaceId === "workspace-2") {
            return [
              {
                name: "Pet Feliz",
                address: "Av. Brasil, Salvador",
                phone: "(71) 90000-1111",
                website: null,
                instagramUrl: null,
                referenceUrl: "https://maps.example/pet-feliz",
                dedupeKey: null,
              },
            ];
          }

          return [];
        }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new LeadsService(prisma as never);

    await service.createMany([
      {
        name: "Barris Store",
        address: "Rua Conselheiro Junqueira Ayres, Salvador",
        phone: "(71) 98353-5867",
        referenceUrl: "https://maps.example/barris",
        campaignId: "campaign-1",
        workspaceId: "workspace-1",
      },
      {
        name: "Pet Feliz",
        address: "Av. Brasil, Salvador",
        phone: "(71) 90000-1111",
        referenceUrl: "https://maps.example/pet-feliz",
        campaignId: "campaign-2",
        workspaceId: "workspace-2",
      },
      {
        name: "Clinica Vet Nova",
        address: "Rua Nova, Salvador",
        phone: "(71) 94444-2222",
        campaignId: "campaign-2",
        workspaceId: "workspace-2",
      },
    ]);

    expect(prisma.lead.findMany).toHaveBeenCalledTimes(2);
    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workspaceId: "workspace-1" }),
    }));
    expect(prisma.lead.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ workspaceId: "workspace-2" }),
    }));
    expect(prisma.lead.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          name: "Clinica Vet Nova",
          workspaceId: "workspace-2",
        }),
      ],
      skipDuplicates: true,
    });
  });
});
