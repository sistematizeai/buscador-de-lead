import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CampaignsService } from "../campaigns/campaigns.service";
import { LeadsService } from "../leads/leads.service";
import { LeadIntelligenceService } from "../ai/lead-intelligence.service";
import { MarketingAiService } from "../ai/marketing-ai.service";
import { LeadExtractorService } from "../ai/lead-extractor.service";
import { GoogleMapsScraperService } from "./google-maps.scraper";
import { GosomGoogleMapsProvider } from "./providers/gosom-google-maps.provider";
import { InstagramDorkProvider, normalizeInstagramProfileUrl } from "./providers/instagram-dork.provider";
import { FacebookMarketplaceProvider } from "./providers/facebook-marketplace.provider";
import type { ScrapedBusiness, ScraperProvider } from "./scraper-provider.interface";
import {
  buildCampaignSearchQueries,
  normalizeCampaignSources,
  type CampaignSearchSource,
} from "../campaigns/campaign-query-planner";

export interface ScraperJobData {
  campaignId: string;
  workspaceId: string;
  searchQueries: string[];
  industry: string;
  location: string;
  maxResults: number;
  yourService: string;
  contentStyle: string;
  language: string;
  source?: string;
}

@Injectable()
export class ScraperProcessor {
  private readonly logger = new Logger(ScraperProcessor.name);

  constructor(
    private campaigns: CampaignsService,
    private leads: LeadsService,
    private leadIntelligence: LeadIntelligenceService,
    private marketingAi: MarketingAiService,
    private leadExtractor: LeadExtractorService,
    private googleMaps: GoogleMapsScraperService,
    private gosomMaps: GosomGoogleMapsProvider,
    private instagramDork: InstagramDorkProvider,
    private fbMarketplace: FacebookMarketplaceProvider,
    private config: ConfigService,
  ) {}

  async process(data: ScraperJobData): Promise<void> {
    const { campaignId, workspaceId } = data;
    this.logger.log(`Iniciando campanha ${campaignId}`);

    try {
      await this.campaigns.updateStatus(campaignId, workspaceId, "running", 0);

      const rawLeads = await this.scrapeLeads(data);
      let total = rawLeads.length;

      if (total === 0) {
        await this.campaigns.updateStatus(campaignId, workspaceId, "failed", 0, "Nenhum lead encontrado");
        return;
      }

      await this.campaigns.updateStatus(campaignId, workspaceId, "running", 30);

      let processedRawLeads = rawLeads;

      if (rawLeads.some((lead) => this.needsAiExtraction(lead.source))) {
        this.logger.log(`Enriquecendo ${rawLeads.length} leads usando extração por IA...`);
        const enriched = await Promise.all(
          rawLeads.map(async (lead) => {
            if (!this.needsAiExtraction(lead.source)) return lead;

            const rawText = lead.category || "";
            try {
              const extracted = await this.leadExtractor.extractContacts(rawText, workspaceId);

              if (!extracted.isQualified) {
                return this.shouldPreserveSocialLead(lead)
                  ? {
                      ...lead,
                      rawTextScraped: rawText,
                    }
                  : null;
              }

              return {
                ...lead,
                name: extracted.businessName || lead.name,
                phone: extracted.phone || "",
                email: extracted.email || "",
                website: extracted.website || lead.website,
                hasWebsite: !!extracted.website,
                rawTextScraped: rawText,
                category: extracted.category || data.industry,
              };
            } catch (err) {
              this.logger.warn(`Falha na extração de contatos por IA para ${lead.name}: ${err}`);
              return lead;
            }
          }),
        );
        processedRawLeads = enriched.filter(Boolean) as any[];
        total = processedRawLeads.length;

        if (total === 0) {
          await this.campaigns.updateStatus(campaignId, workspaceId, "failed", 0, "Nenhum lead qualificado encontrado");
          return;
        }
      }

      processedRawLeads = await this.enrichInstagramProfiles(processedRawLeads, data);

      const scoredLeads = this.leadIntelligence.scoreLeads(processedRawLeads, data.industry);
      await this.campaigns.updateStatus(campaignId, workspaceId, "running", 60);

      const processedLeads = await Promise.all(
        scoredLeads.map(async (lead, index) => {
          const leadSource = (lead as { source?: string }).source || "google_maps";
          let marketingContent = null;

          if (lead.priority === "HIGH") {
            try {
              marketingContent = await this.marketingAi.generateContent({
                businessName: lead.name,
                address: lead.address,
                industry: data.industry,
                rating: lead.rating,
                hasWebsite: lead.hasWebsite,
                yourService: data.yourService,
                contentStyle: data.contentStyle,
                language: data.language,
                score: lead.score,
                catalogOpportunity: lead.catalogOpportunity,
                workspaceId,
              });
            } catch (error) {
              this.logger.warn(`Falha ao gerar conteúdo para ${lead.name}: ${error}`);
            }
          }

          if (index % 5 === 0) {
            const pct = 60 + Math.round((index / total) * 35);
            await this.campaigns.updateStatus(campaignId, workspaceId, "running", pct);
          }

          return {
            name: lead.name,
            address: lead.address,
            phone: lead.phone,
            email: (lead as any).email || undefined,
            website: lead.website,
            instagramUrl: (lead as any).instagramUrl || null,
            rating: lead.rating,
            category: lead.category,
            referenceUrl: lead.referenceLink,
            hasWebsite: lead.hasWebsite ?? false,
            score: lead.score,
            priority: lead.priority,
            aiAnalysis: {
              factors: lead.factors,
              recommendation: lead.recommendation,
              catalogOpportunity: lead.catalogOpportunity,
            },
            marketingContent,
            campaignId,
            workspaceId,
            source: leadSource,
            rawTextScraped: (lead as any).rawTextScraped || null,
          };
        }),
      );

      const uniqueProcessedLeads = await this.leads.filterNewLeads(processedLeads);
      await this.leads.createMany(uniqueProcessedLeads, { alreadyDeduped: true });

      const highQuality = uniqueProcessedLeads.filter((lead) => (lead.score ?? 0) >= 70).length;
      const priority = uniqueProcessedLeads.filter((lead) => lead.priority === "HIGH").length;
      const avgScore = Math.round(
        uniqueProcessedLeads.length > 0
          ? uniqueProcessedLeads.reduce((sum, lead) => sum + (lead.score ?? 0), 0) / uniqueProcessedLeads.length
          : 0,
      );

      await this.campaigns.updateStats(campaignId, workspaceId, {
        totalLeads: uniqueProcessedLeads.length,
        priorityLeads: priority,
        highQualityLeads: highQuality,
        averageScore: avgScore,
      });

      await this.campaigns.updateStatus(campaignId, workspaceId, "completed", 100);
      this.logger.log(
        `Campanha ${campaignId} concluída: ${uniqueProcessedLeads.length} leads novos, ${priority} prioritários`,
      );
    } catch (err) {
      this.logger.error(`Campanha ${campaignId} falhou: ${err}`);
      await this.campaigns.updateStatus(campaignId, workspaceId, "failed", undefined, String(err));
    }
  }

  private async scrapeLeads(data: ScraperJobData) {
    const selectedSources = normalizeCampaignSources(data.source);
    const targetTotal = Math.max(1, data.maxResults || 20);
    const results: ReturnType<typeof this.normalizeRaw>[] = [];
    const seen = new Set<string>();
    const allowMockFallback = this.config.get<string>("SCRAPER_ALLOW_MOCK_FALLBACK") === "true";
    const maxRounds = this.getScrapeMaxRounds();

    for (let round = 1; round <= maxRounds && results.length < targetTotal; round++) {
      const beforeRound = results.length;
      const beforeSeen = seen.size;

      for (const source of selectedSources) {
        const provider = this.selectScraperProvider(source);
        const plannedQueries = buildCampaignSearchQueries({
          industry: data.industry,
          location: data.location,
          searchQueries: data.searchQueries,
          source,
          targetWebsiteMode: "any",
        });

        for (const query of plannedQueries) {
          const remaining = targetTotal - results.length;
          if (remaining <= 0) break;

          try {
            const requested = this.getProviderRequestSize(targetTotal, remaining, round);
            const raw = await this.scrapeWithRetry(provider, query, requested, source, round);
            const normalized = raw.map((business) => this.normalizeRaw(business, data.industry, source));
            const unseenLeads = this.collectUnseenLeads(seen, normalized);
            const databaseNewLeads = await this.filterScrapedLeadsNotInDatabase(unseenLeads, data);
            const added = this.appendLeads(results, databaseNewLeads, targetTotal);
            this.logger.log(
              `Busca "${query}" (${source}, rodada ${round}): ${raw.length} resultados, ${added} novos no banco, ${results.length}/${targetTotal}`,
            );
          } catch (err) {
            if (!allowMockFallback) {
              this.logger.error(`Busca falhou definitivamente para "${query}": ${err}`);
              continue;
            }
            this.logger.warn(`Busca falhou para "${query}", usando fallback mock explícito: ${err}`);
            const mockLeads = this.generateMockLeads(data, query, remaining, source);
            const unseenLeads = this.collectUnseenLeads(seen, mockLeads);
            const databaseNewLeads = await this.filterScrapedLeadsNotInDatabase(unseenLeads, data);
            this.appendLeads(results, databaseNewLeads, targetTotal);
          }
        }
      }

      if (results.length >= targetTotal) break;

      if (results.length === beforeRound && seen.size === beforeSeen) {
        this.logger.warn(
          `Busca encerrada com ${results.length}/${targetTotal} leads: novas rodadas não retornaram leads únicos.`,
        );
        break;
      }
    }

    if (results.length < targetTotal) {
      this.logger.warn(`Campanha solicitou ${targetTotal} leads, mas a coleta encontrou ${results.length} leads únicos.`);
    }

    return results.slice(0, targetTotal);
  }

  private collectUnseenLeads<T extends { name: string; address: string; referenceLink: string; source: string }>(
    seen: Set<string>,
    candidates: T[],
  ) {
    const unique: T[] = [];

    for (const candidate of candidates) {
      const key = this.getLeadDedupeKey(candidate);
      if (seen.has(key)) continue;

      seen.add(key);
      unique.push(candidate);
    }

    return unique;
  }

  private appendLeads<T>(target: T[], candidates: T[], limit: number) {
    let added = 0;

    for (const candidate of candidates) {
      if (target.length >= limit) break;
      target.push(candidate);
      added += 1;
    }

    return added;
  }

  private getLeadDedupeKey(lead: { source: string; name: string; address: string; referenceLink: string }) {
    return `${lead.source}|${lead.name.toLowerCase()}|${lead.address.toLowerCase()}|${lead.referenceLink.toLowerCase()}`;
  }

  private async filterScrapedLeadsNotInDatabase<T extends ReturnType<typeof this.normalizeRaw>>(
    leads: T[],
    data: ScraperJobData,
  ) {
    if (leads.length === 0) return [];

    const lookupLeads = leads.map((lead) => ({
      name: lead.name,
      address: lead.address,
      phone: lead.phone,
      website: lead.website,
      instagramUrl: lead.instagramUrl,
      rating: lead.rating,
      category: lead.category,
      source: lead.source,
      referenceUrl: lead.referenceLink,
      hasWebsite: lead.hasWebsite,
      campaignId: data.campaignId,
      workspaceId: data.workspaceId,
    }));
    const freshLeads = await this.leads.filterNewLeads(lookupLeads);
    const freshKeys = new Set(
      freshLeads.map((lead) =>
        this.getLeadDedupeKey({
          source: lead.source || "",
          name: lead.name,
          address: lead.address || "",
          referenceLink: lead.referenceUrl || "",
        }),
      ),
    );

    return leads.filter((lead) => freshKeys.has(this.getLeadDedupeKey(lead)));
  }

  private getProviderRequestSize(targetTotal: number, remaining: number, round: number) {
    const buffer = Math.max(5, Math.ceil(targetTotal * 0.2));
    const roundGrowth = Math.max(0, round - 1) * Math.ceil(targetTotal * 0.25);
    return Math.max(remaining, Math.min(targetTotal + buffer + roundGrowth, targetTotal * 2));
  }

  private async scrapeWithRetry(
    provider: ScraperProvider,
    query: string,
    requested: number,
    source: CampaignSearchSource,
    round: number,
  ) {
    const maxAttempts = this.getQueryMaxAttempts();
    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await provider.scrape(query, requested);
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          this.logger.warn(
            `Busca "${query}" (${source}, rodada ${round}) falhou na tentativa ${attempt}/${maxAttempts}; tentando novamente: ${error}`,
          );
        }
      }
    }

    throw lastError;
  }

  private getQueryMaxAttempts() {
    const rawRetries = this.config.get<string>("SCRAPER_QUERY_RETRIES");
    const retries = rawRetries ? Number(rawRetries) : Number.NaN;

    if (Number.isFinite(retries) && retries >= 0) {
      return Math.floor(retries) + 1;
    }

    return 3;
  }

  private getScrapeMaxRounds() {
    const raw = this.config.get<string>("SCRAPER_MAX_ROUNDS");
    const parsed = raw ? Number(raw) : Number.NaN;

    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.floor(parsed);
    }

    return 6;
  }

  private normalizeRaw(raw: ScrapedBusiness, industry: string, fallbackSource: CampaignSearchSource) {
    return {
      name: raw.name,
      address: raw.address,
      phone: raw.phone ?? "",
      website: raw.website ?? "",
      instagramUrl: raw.instagramUrl ?? "",
      rating: raw.rating ?? "N/A",
      category: raw.category ?? industry,
      referenceLink: raw.referenceLink ?? "",
      hasWebsite: raw.hasWebsite ?? !!raw.website,
      industry,
      source: raw.source || fallbackSource,
    };
  }

  private async enrichInstagramProfiles<T extends {
    name: string;
    address?: string;
    category?: string;
    referenceLink?: string;
    instagramUrl?: string;
  }>(leads: T[], data: ScraperJobData): Promise<T[]> {
    if (this.config.get<string>("INSTAGRAM_LOOKUP_ENABLED") === "false") {
      return leads;
    }

    const limit = this.getInstagramLookupLimit(leads.length);
    if (limit <= 0) return leads;

    this.logger.log(`Buscando Instagram individualmente para ate ${limit} lojas sem perfil salvo...`);

    const enriched: T[] = [];
    let lookups = 0;
    let found = 0;

    for (const lead of leads) {
      const existingInstagram = this.resolveInstagramUrl(lead);
      if (existingInstagram) {
        enriched.push({ ...lead, instagramUrl: existingInstagram });
        continue;
      }

      if (lookups >= limit) {
        enriched.push(lead);
        continue;
      }

      lookups += 1;

      try {
        const instagramUrl = await this.instagramDork.findProfileForBusiness({
          name: lead.name,
          address: lead.address,
          location: data.location,
          category: lead.category || data.industry,
        });

        if (instagramUrl) {
          found += 1;
          this.logger.log(`Instagram encontrado para "${lead.name}": ${instagramUrl}`);
          enriched.push({ ...lead, instagramUrl });
        } else {
          this.logger.log(`Instagram nao encontrado para "${lead.name}"`);
          enriched.push(lead);
        }
      } catch (error) {
        this.logger.warn(`Falha isolada ao buscar Instagram para "${lead.name}": ${error}`);
        enriched.push(lead);
      }

      if (lookups % 3 === 0 || lookups === limit) {
        const pct = 35 + Math.round((lookups / limit) * 20);
        await this.campaigns.updateStatus(data.campaignId, data.workspaceId, "running", pct);
      }
    }

    this.logger.log(`Enriquecimento Instagram concluido: ${found}/${lookups} perfis encontrados.`);
    return enriched;
  }

  private resolveInstagramUrl(lead: { instagramUrl?: string; referenceLink?: string }) {
    return normalizeInstagramProfileUrl(lead.instagramUrl || "") ?? normalizeInstagramProfileUrl(lead.referenceLink || "");
  }

  private getInstagramLookupLimit(total: number) {
    const rawLimit = this.config.get<string>("INSTAGRAM_LOOKUP_MAX_PER_CAMPAIGN");
    const parsedLimit = rawLimit ? Number(rawLimit) : Number.NaN;

    if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
      return Math.min(total, Math.floor(parsedLimit));
    }

    return total;
  }

  private selectScraperProvider(source?: string): ScraperProvider {
    const channel = source || "google_maps";

    if (channel === "instagram") {
      this.logger.log("Usando provedor Instagram Dork para busca");
      return this.instagramDork;
    }

    if (channel === "facebook_marketplace") {
      this.logger.log("Usando provedor Facebook Marketplace para busca");
      return this.fbMarketplace;
    }

    const configured = (this.config.get<string>("SCRAPER_PROVIDER") || "auto").toLowerCase();

    if (configured === "playwright") {
      this.logger.log("Usando provedor Playwright para Google Maps");
      return this.googleMaps;
    }

    if (configured === "gosom") {
      if (!this.gosomMaps.isAvailable()) {
        throw new Error(
          "SCRAPER_PROVIDER=gosom exige o binario do Gosom disponivel. Configure GOSOM_BINARY_PATH ou use SCRAPER_PROVIDER=auto/playwright para permitir fallback.",
        );
      }
      this.logger.log("Usando provedor Gosom para Google Maps");
      return this.gosomMaps;
    }

    if (configured !== "auto") {
      throw new Error(`Valor inválido para SCRAPER_PROVIDER: ${configured}`);
    }

    if (this.gosomMaps.isAvailable()) {
      this.logger.log("Usando provedor Gosom para Google Maps");
      return this.gosomMaps;
    }

    this.logger.warn("Binário do Gosom indisponível; usando fallback Playwright para Google Maps");
    return this.googleMaps;
  }

  private needsAiExtraction(source?: string) {
    return source === "instagram" || source === "facebook_marketplace";
  }

  private shouldPreserveSocialLead(lead: { source?: string; referenceLink?: string; instagramUrl?: string }) {
    if (!this.needsAiExtraction(lead.source)) return false;
    return Boolean(lead.referenceLink || lead.instagramUrl);
  }

  private generateMockLeads(data: ScraperJobData, query: string, count: number, source: CampaignSearchSource) {
    const label = query || data.industry;
    const prefixes = [
      `${label} Prime`, `${label} Central`, `${label} Digital`,
      `${label} Express`, `${label} Premium`, `${label} Mais`,
      `${label} Brasil`, `${label} Soluções`, `${label} Pro`, `${label} Online`,
    ];

    return Array.from({ length: Math.min(count, prefixes.length) }, (_, i) => ({
      name: prefixes[i],
      address: `Rua ${data.location}, ${10 + i}, ${data.location}`,
      phone: `+55 11 9${String(10000000 + i * 1234567).slice(0, 8)}`,
      website: i % 3 !== 0 ? `www.${label.toLowerCase().replace(/\s+/g, "")}${i + 1}.com` : "",
      instagramUrl: "",
      rating: ((3.5 + (i % 3) * 0.4)).toFixed(1),
      category: data.industry,
      referenceLink: "",
      hasWebsite: i % 3 !== 0,
      industry: data.industry,
      source,
    }));
  }
}
