import { describe, expect, it } from "vitest";
import { planLeadDedupeBackfill } from "./lead-dedupe-backfill";

describe("planLeadDedupeBackfill", () => {
  it("fills canonical legacy leads and skips duplicate keys inside the same workspace", () => {
    const plan = planLeadDedupeBackfill([
      {
        id: "lead-1",
        workspaceId: "workspace-1",
        name: "Pet Feliz",
        address: "Av. Brasil, Salvador",
        phone: "(71) 90000-1111",
        website: "https://www.petfeliz.com.br/",
        instagramUrl: null,
        referenceUrl: null,
        dedupeKey: null,
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "lead-2",
        workspaceId: "workspace-1",
        name: "Pet Feliz",
        address: "Av Brasil Salvador",
        phone: "71900001111",
        website: "https://petfeliz.com.br",
        instagramUrl: null,
        referenceUrl: null,
        dedupeKey: null,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: "lead-3",
        workspaceId: "workspace-2",
        name: "Pet Feliz",
        address: "Av. Brasil, Salvador",
        phone: "(71) 90000-1111",
        website: "https://www.petfeliz.com.br/",
        instagramUrl: null,
        referenceUrl: null,
        dedupeKey: null,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ]);

    expect(plan.updates).toEqual([
      { id: "lead-1", dedupeKey: "site:petfeliz.com.br" },
      { id: "lead-3", dedupeKey: "site:petfeliz.com.br" },
    ]);
    expect(plan.skippedDuplicates).toEqual([
      {
        id: "lead-2",
        duplicateOf: "lead-1",
        dedupeKey: "site:petfeliz.com.br",
      },
    ]);
    expect(plan.skippedNoKey).toEqual([]);
  });

  it("reserves existing dedupe keys and only updates empty safe records", () => {
    const plan = planLeadDedupeBackfill([
      {
        id: "lead-1",
        workspaceId: "workspace-1",
        name: "Loja Existente",
        address: "Rua A",
        phone: null,
        website: "https://loja.com.br",
        instagramUrl: null,
        referenceUrl: null,
        dedupeKey: "site:loja.com.br",
        createdAt: new Date("2026-01-01T00:00:00.000Z"),
      },
      {
        id: "lead-2",
        workspaceId: "workspace-1",
        name: "Loja Existente",
        address: "Rua A",
        phone: null,
        website: "https://www.loja.com.br/",
        instagramUrl: null,
        referenceUrl: null,
        dedupeKey: null,
        createdAt: new Date("2026-01-02T00:00:00.000Z"),
      },
      {
        id: "lead-3",
        workspaceId: "workspace-1",
        name: "Lead Sem Dados Fortes",
        address: null,
        phone: null,
        website: null,
        instagramUrl: null,
        referenceUrl: null,
        dedupeKey: null,
        createdAt: new Date("2026-01-03T00:00:00.000Z"),
      },
    ]);

    expect(plan.updates).toEqual([]);
    expect(plan.alreadyFilled).toBe(1);
    expect(plan.skippedDuplicates).toEqual([
      {
        id: "lead-2",
        duplicateOf: "lead-1",
        dedupeKey: "site:loja.com.br",
      },
    ]);
    expect(plan.skippedNoKey).toEqual([{ id: "lead-3" }]);
  });
});
