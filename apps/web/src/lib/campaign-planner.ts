export interface CampaignRegionConfig {
  country?: string;
  state?: string;
  city?: string;
  district?: string;
  street?: string;
}

export interface BuildCampaignSearchQueriesInput {
  industry: string;
  location: string;
  searchQueries?: string[];
  targetWebsiteMode?: "any" | "missing_website";
}

export function buildRegionLabel(region: CampaignRegionConfig) {
  return [region.country, region.state, region.city, region.district, region.street]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" > ");
}

export function buildCampaignSearchQueries(input: BuildCampaignSearchQueriesInput) {
  const industry = input.industry.trim();
  const region = input.location.replace(/>/g, " ").replace(/\s+/g, " ").trim();
  const manualQueries = (input.searchQueries ?? []).map((query) => query.trim()).filter(Boolean);
  const targetMissingWebsite = input.targetWebsiteMode === "missing_website";
  const baseQueries = manualQueries.length > 0
    ? manualQueries
    : [
        `${industry} ${region}`,
        `${industry} sem site ${region}`,
        `${industry} sem catálogo online ${region}`,
        `${industry} perto de ${region}`,
      ];
  const targetedQueries = targetMissingWebsite
    ? baseQueries.flatMap((query) => [
        ensureMissingWebsiteIntent(query, "sem site"),
        ensureMissingWebsiteIntent(query, "sem catálogo online"),
      ])
    : baseQueries;

  return unique(targetedQueries.map((query) => enforceStrictNicheAndRegion(query, industry, region))).slice(0, 8);
}

function enforceStrictNicheAndRegion(query: string, industry: string, region: string) {
  const normalizedQuery = normalize(query);
  const parts: string[] = [];

  if (!normalizedQuery.includes(normalize(industry))) parts.push(industry);
  parts.push(query.trim());
  if (region && !normalizedQuery.includes(normalize(region))) parts.push(region);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function ensureMissingWebsiteIntent(query: string, intent: "sem site" | "sem catálogo online") {
  if (normalize(query).includes(normalize(intent))) return query;
  return `${query.trim()} ${intent}`;
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalize(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}
