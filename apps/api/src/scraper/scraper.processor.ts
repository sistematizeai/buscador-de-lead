import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { CampaignsService } from "../campaigns/campaigns.service";
import { LeadsService } from "../leads/leads.service";
import { LeadIntelligenceService } from "../ai/lead-intelligence.service";
import { MarketingAiService } from "../ai/marketing-ai.service";
import { LeadExtractorService } from "../ai/lead-extractor.service";
import { GoogleMapsScraperService } from "./google-maps.scraper";
import { GosomGoogleMapsProvider } from "./providers/gosom-google-maps.provider";
import { InstagramDorkProvider } from "./providers/instagram-dork.provider";
import { FacebookMarketplaceProvider } from "./providers/facebook-marketplace.provider";
import type { ScrapedBusiness, ScraperProvider } from "./scraper-provider.interface";
import { buildCampaignSearchQueries } from "../campaigns/campaign-query-planner";

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
      await this.campaigns.updateStatus(campaignId, "running", 0);

      const rawLeads = await this.scrapeLeads(data);
      let total = rawLeads.length;

      if (total === 0) {
        await this.campaigns.updateStatus(campaignId, "failed", 0, "Nenhum lead encontrado");
        return;
      }

      await this.campaigns.updateStatus(campaignId, "running", 30);

      const channel = data.source || "google_maps";
      let processedRawLeads = rawLeads;

      // Fase de enriquecimento cognitivo usando a IA se for Instagram/Marketplace
      if (channel === "instagram" || channel === "facebook_marketplace") {
        this.logger.log(`Enriquecendo ${rawLeads.length} leads usando extração por IA...`);
        const enriched = await Promise.all(
          rawLeads.map(async (lead) => {
            const rawText = lead.category || "";
            try {
              const extracted = await this.leadExtractor.extractContacts(rawText, workspaceId);
              
              if (!extracted.isQualified) {
                return null;
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
          })
        );
        processedRawLeads = enriched.filter(Boolean) as any[];
        total = processedRawLeads.length;
        
        if (total === 0) {
          await this.campaigns.updateStatus(campaignId, "failed", 0, "Nenhum lead qualificado encontrado");
          return;
        }
      }

      const scoredLeads = this.leadIntelligence.scoreLeads(processedRawLeads, data.industry);
      await this.campaigns.updateStatus(campaignId, "running", 60);

      const processedLeads = await Promise.all(
        scoredLeads.map(async (lead, i) => {
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
            } catch (e) {
              this.logger.warn(`Falha ao gerar conteúdo para ${lead.name}: ${e}`);
            }
          }
          if (i % 5 === 0) {
            const pct = 60 + Math.round((i / total) * 35);
            await this.campaigns.updateStatus(campaignId, "running", pct);
          }
          return {
            name: lead.name,
            address: lead.address,
            phone: lead.phone,
            website: lead.website,
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
            source: channel,
            rawTextScraped: (lead as any).rawTextScraped || null,
          };
        }),
      );

      await this.leads.createMany(processedLeads);

      const highQuality = processedLeads.filter((l) => (l.score ?? 0) >= 70).length;
      const priority = processedLeads.filter((l) => l.priority === "HIGH").length;
      const avgScore = Math.round(
        processedLeads.reduce((s, l) => s + (l.score ?? 0), 0) / processedLeads.length,
      );

      await this.campaigns.updateStats(campaignId, {
        totalLeads: total,
        priorityLeads: priority,
        highQualityLeads: highQuality,
        averageScore: avgScore,
      });

      await this.campaigns.updateStatus(campaignId, "completed", 100);
      this.logger.log(`Campanha ${campaignId} concluída: ${total} leads, ${priority} prioritários`);
    } catch (err) {
      this.logger.error(`Campanha ${campaignId} falhou: ${err}`);
      await this.campaigns.updateStatus(campaignId, "failed", undefined, String(err));
    }
  }

  private async scrapeLeads(data: ScraperJobData) {
    const plannedQueries = buildCampaignSearchQueries({
      industry: data.industry,
      location: data.location,
      searchQueries: data.searchQueries,
      targetWebsiteMode: "any",
    });
    const perQuery = Math.max(1, Math.ceil(data.maxResults / plannedQueries.length));
    const results: ReturnType<typeof this.normalizeRaw>[] = [];
    const provider = this.selectScraperProvider(data.source);
    const allowMockFallback = this.config.get<string>("SCRAPER_ALLOW_MOCK_FALLBACK") === "true";

    for (const query of plannedQueries) {
      try {
        const raw = await provider.scrape(query, perQuery);
        results.push(...raw.map((b) => this.normalizeRaw(b, data.industry)));
        this.logger.log(`Busca "${query}": ${raw.length} resultados`);
      } catch (err) {
        if (!allowMockFallback) {
          this.logger.error(`Busca falhou para "${query}": ${err}`);
          throw err;
        }
        this.logger.warn(`Busca falhou para "${query}", usando fallback mock explícito: ${err}`);
        results.push(...this.generateMockLeads(data, query, perQuery));
      }
    }

    // Remove duplicados por nome e endereço.
    const seen = new Set<string>();
    return results.filter((b) => {
      const key = `${b.name.toLowerCase()}|${b.address.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private normalizeRaw(raw: ScrapedBusiness, industry: string) {
    return {
      name: raw.name,
      address: raw.address,
      phone: raw.phone ?? "",
      website: raw.website ?? "",
      rating: raw.rating ?? "N/A",
      category: raw.category ?? industry,
      referenceLink: raw.referenceLink ?? "",
      hasWebsite: raw.hasWebsite ?? !!raw.website,
      industry,
    };
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
        throw new Error("SCRAPER_PROVIDER=gosom, mas o binário do Gosom não está disponível");
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

  private generateMockLeads(data: ScraperJobData, query: string, count: number) {
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
      rating: ((3.5 + (i % 3) * 0.4)).toFixed(1),
      category: data.industry,
      referenceLink: "",
      hasWebsite: i % 3 !== 0,
      industry: data.industry,
    }));
  }
}
