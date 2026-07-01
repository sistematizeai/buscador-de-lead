import { BadRequestException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import { CompanySearchService } from "./company-search.service";

function makeService(prismaOverrides: Record<string, any> = {}) {
  const prisma = {
    companySearchLog: { create: vi.fn().mockResolvedValue({ id: "search-1" }) },
    lead: {
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: "lead-1", name: "Empresa Teste" }),
    },
    leadActivity: { create: vi.fn().mockResolvedValue({ id: "activity-1" }) },
    ...prismaOverrides,
  };
  const service = new CompanySearchService(
    prisma as never,
    {} as never,
    { get: vi.fn() } as never,
    { assertAllowed: vi.fn() } as never,
    { record: vi.fn().mockResolvedValue(undefined) } as never,
  );
  return { service, prisma };
}

const meta = {
  userId: "user-1",
  workspaceId: "workspace-1",
  ipAddress: "127.0.0.1",
  userAgent: "vitest",
};

describe("CompanySearchService", () => {
  it("blocks invalid CNPJ before provider calls", async () => {
    const { service } = makeService();

    await expect(service.search({ cnpj: "00.000.000/0000-00" }, meta)).rejects.toBeInstanceOf(BadRequestException);
  });

  it("searches individual tenant data without saving a lead automatically", async () => {
    const { service, prisma } = makeService({
      lead: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: "lead-existing",
            name: "Barris Store",
            tradeName: "Barris Store",
            cnpj: null,
            businessStatus: null,
            cnae: null,
            industry: "Varejo",
            category: "Petshop",
            address: "Salvador - BA",
            zipCode: null,
            phone: "(71) 90000-0000",
            email: null,
            website: null,
            referenceUrl: null,
            updatedAt: new Date(),
          },
        ]),
        findFirst: vi.fn(),
        create: vi.fn(),
      },
    });

    const response = await service.search({ companyName: "Barris", city: "Salvador" }, meta);

    expect(response.savedAutomatically).toBe(false);
    expect(response.results).toHaveLength(1);
    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(prisma.companySearchLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace-1",
        userId: "user-1",
        status: "found",
      }),
    });
  });

  it("does not save a duplicate CNPJ inside the same workspace", async () => {
    const existing = { id: "lead-existing", name: "Empresa Existente" };
    const { service, prisma } = makeService({
      lead: {
        findMany: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(existing),
        create: vi.fn(),
      },
    });

    const response = await service.saveToCrm({
      companyName: "Empresa Existente",
      cnpj: "11.222.333/0001-81",
    }, meta);

    expect(response.duplicate).toBe(true);
    expect(response.lead).toBe(existing);
    expect(prisma.lead.create).not.toHaveBeenCalled();
    expect(prisma.lead.findFirst).toHaveBeenCalledWith({
      where: expect.objectContaining({
        workspaceId: "workspace-1",
      }),
    });
  });

  it("creates manual CRM leads as potential customers only after explicit save", async () => {
    const { service, prisma } = makeService();

    const response = await service.saveToCrm({
      companyName: "Nova Empresa",
      cnpj: "11.222.333/0001-81",
      address: "Salvador - BA",
      tags: ["Busca de Empresa"],
    }, meta);

    expect(response.created).toBe(true);
    expect(prisma.lead.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        workspaceId: "workspace-1",
        name: "Nova Empresa",
        cnpj: "11222333000181",
        source: "company_search",
        searchOrigin: "Busca de Empresa",
        crmStatus: "potential_customer",
      }),
    });
  });
});
