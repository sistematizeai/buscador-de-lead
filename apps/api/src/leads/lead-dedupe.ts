export interface LeadDedupeInput {
  name: string;
  address?: string | null;
  phone?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  referenceUrl?: string | null;
  dedupeKey?: string | null;
}

export function buildLeadDedupeKey(lead: LeadDedupeInput) {
  return getComputedLeadDuplicateKeys(lead)[0] ?? null;
}

export function getLeadDuplicateKeys(lead: LeadDedupeInput) {
  return unique([
    lead.dedupeKey || null,
    ...getComputedLeadDuplicateKeys(lead),
  ].filter((key): key is string => Boolean(key)));
}

function getComputedLeadDuplicateKeys(lead: LeadDedupeInput) {
  const keys = [
    normalizeLeadUrl(lead.referenceUrl) ? `ref:${normalizeLeadUrl(lead.referenceUrl)}` : null,
    normalizeLeadUrl(lead.website) ? `site:${normalizeLeadUrl(lead.website)}` : null,
    normalizeLeadUrl(lead.instagramUrl) ? `ig:${normalizeLeadUrl(lead.instagramUrl)}` : null,
    normalizeLeadPhone(lead.phone) ? `phone:${normalizeLeadPhone(lead.phone)}` : null,
  ].filter((key): key is string => Boolean(key));
  const name = normalizeLeadText(lead.name);
  const address = normalizeLeadText(lead.address);

  if (name && address) {
    keys.push(`name-address:${name}|${address}`);
  }

  return keys;
}

export function normalizeLeadText(value?: string | null) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function normalizeLeadUrl(value?: string | null) {
  const raw = (value ?? "").trim();
  if (!raw) return "";

  try {
    const parsed = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    return `${parsed.hostname.replace(/^www\./, "").toLowerCase()}${parsed.pathname.replace(/\/+$/, "").toLowerCase()}`;
  } catch {
    return raw.replace(/^https?:\/\//i, "").replace(/^www\./i, "").replace(/\/+$/, "").toLowerCase();
  }
}

export function normalizeLeadPhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
