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

export const CAMPAIGN_SEARCH_SOURCES = ["google_maps", "instagram", "facebook_marketplace"] as const;
export type CampaignSearchSource = (typeof CAMPAIGN_SEARCH_SOURCES)[number];

const INDUSTRY_SEARCH_TERMS: Record<string, string> = {
  restaurant: "Restaurantes e alimentação",
  cafe: "Cafés e cafeterias",
  retail: "Lojas de varejo e moda",
  automotive: "Oficinas e lojas automotivas",
  healthcare: "Clínicas e consultórios",
  beauty: "Salões de beleza e estética",
  petshop: "Pet shops e banho e tosa",
  education: "Cursos e escolas",
  realestate: "Imobiliárias",
  event: "Empresas de eventos",
  tech: "Empresas de tecnologia",
  professional: "Serviços profissionais",
};

export function buildRegionLabel(region: CampaignRegionConfig) {
  return [region.country, region.state, region.city, region.district, region.street]
    .map((part) => part?.trim())
    .filter((part): part is string => Boolean(part))
    .join(" > ");
}

export function buildCampaignSearchQueries(input: BuildCampaignSearchQueriesInput) {
  const industry = resolveIndustrySearchTerm(input.industry);
  const region = toSearchText(input.location);
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

  return unique(
    targetedQueries
      .map((query) => enforceStrictNicheAndRegion(query, industry, region))
      .filter((query) => query.length > 0),
  ).slice(0, 8);
}

export function resolveIndustrySearchTerm(industry: string) {
  const trimmed = industry.trim();
  return INDUSTRY_SEARCH_TERMS[trimmed] ?? trimmed;
}

export function normalizeCampaignSources(source?: string | string[] | null): CampaignSearchSource[] {
  const rawValues = Array.isArray(source)
    ? source
    : typeof source === "string"
      ? source.split(",")
      : [];
  const allowed = new Set<string>(CAMPAIGN_SEARCH_SOURCES);
  const seen = new Set<string>();
  const normalized = rawValues
    .map((value) => value.trim())
    .filter((value): value is CampaignSearchSource => allowed.has(value))
    .filter((value) => {
      if (seen.has(value)) return false;
      seen.add(value);
      return true;
    });

  return normalized.length > 0 ? normalized : ["google_maps"];
}

function enforceStrictNicheAndRegion(query: string, industry: string, region: string) {
  const parts: string[] = [];
  const normalizedQuery = normalize(query);
  const normalizedIndustry = normalize(industry);
  const normalizedRegion = normalize(region);

  if (!normalizedQuery.includes(normalizedIndustry)) parts.push(industry);
  parts.push(query.trim());
  if (region && !normalizedQuery.includes(normalizedRegion)) parts.push(region);

  return parts.join(" ").replace(/\s+/g, " ").trim();
}

function ensureMissingWebsiteIntent(query: string, intent: "sem site" | "sem catálogo online") {
  const normalizedQuery = normalize(query);
  if (normalizedQuery.includes(normalize(intent))) return query;
  return `${query.trim()} ${intent}`;
}

function toSearchText(value: string) {
  return value.replace(/>/g, " ").replace(/\s+/g, " ").trim();
}

function normalize(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
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
