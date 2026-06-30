import { buildLeadDedupeKey, type LeadDedupeInput } from "./lead-dedupe";

export interface LegacyLeadForDedupe extends LeadDedupeInput {
  id: string;
  workspaceId: string;
  createdAt?: Date | string | null;
}

export interface LeadDedupeBackfillPlan {
  updates: Array<{ id: string; dedupeKey: string }>;
  skippedDuplicates: Array<{ id: string; duplicateOf: string; dedupeKey: string }>;
  skippedNoKey: Array<{ id: string }>;
  alreadyFilled: number;
}

export function planLeadDedupeBackfill(leads: LegacyLeadForDedupe[]): LeadDedupeBackfillPlan {
  const reservedKeys = new Map<string, string>();
  const plan: LeadDedupeBackfillPlan = {
    updates: [],
    skippedDuplicates: [],
    skippedNoKey: [],
    alreadyFilled: 0,
  };

  for (const lead of sortLeadsForBackfill(leads)) {
    if (lead.dedupeKey) {
      reservedKeys.set(workspaceKey(lead.workspaceId, lead.dedupeKey), lead.id);
      plan.alreadyFilled += 1;
      continue;
    }

    const dedupeKey = buildLeadDedupeKey(lead);
    if (!dedupeKey) {
      plan.skippedNoKey.push({ id: lead.id });
      continue;
    }

    const key = workspaceKey(lead.workspaceId, dedupeKey);
    const duplicateOf = reservedKeys.get(key);
    if (duplicateOf) {
      plan.skippedDuplicates.push({ id: lead.id, duplicateOf, dedupeKey });
      continue;
    }

    reservedKeys.set(key, lead.id);
    plan.updates.push({ id: lead.id, dedupeKey });
  }

  return plan;
}

function sortLeadsForBackfill(leads: LegacyLeadForDedupe[]) {
  return [...leads].sort((a, b) => {
    const workspace = a.workspaceId.localeCompare(b.workspaceId);
    if (workspace !== 0) return workspace;

    const createdAt = timestamp(a.createdAt) - timestamp(b.createdAt);
    if (createdAt !== 0) return createdAt;

    return a.id.localeCompare(b.id);
  });
}

function timestamp(value?: Date | string | null) {
  if (!value) return 0;
  return new Date(value).getTime();
}

function workspaceKey(workspaceId: string, dedupeKey: string) {
  return `${workspaceId}:${dedupeKey}`;
}
