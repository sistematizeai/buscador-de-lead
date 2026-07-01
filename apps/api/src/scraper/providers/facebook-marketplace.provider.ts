import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { chromium, Browser, type Page } from "playwright";
import type { ScrapedBusiness, ScraperProvider } from "../scraper-provider.interface";

const SEARCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};

function cleanMarketplaceIndexedTitle(rawTitle: string, link: string) {
  const urlParts = link.split("/").filter(Boolean);
  const fallback = urlParts[urlParts.length - 1] || "Anuncio do Marketplace";
  let title = rawTitle.replace(/\s+/g, " ").trim();

  if (rawTitle.includes("  ")) {
    const parts = rawTitle.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
    const businessPart = parts.find((part) => !part.toLowerCase().includes("facebook.com"));
    if (businessPart) title = businessPart;
  }

  title = title
    .replace(/^facebook\s+marketplace\s+/i, "")
    .replace(/^facebook\s+/i, "")
    .replace(/^m?\.?facebook\.com\s*[\u203a>]\s*/i, "")
    .replace(/^marketplace\s*[\u203a>]\s*/i, "")
    .trim();

  return title || fallback;
}

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

function stripHtml(value: string) {
  return decodeHtml(value.replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}

function normalizeSearchHref(rawHref: string) {
  const href = decodeHtml(rawHref);
  if (!href.startsWith("/")) return href;

  try {
    const parsed = new URL(href, "https://search.brave.com");
    const target = parsed.searchParams.get("url") || parsed.searchParams.get("uddg");
    return target ? decodeHtml(target) : href;
  } catch {
    return href;
  }
}

function extractIndexedMarketplaceResults(html: string) {
  const anchors = html.matchAll(/<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi);
  const results: { title: string; link: string; description: string }[] = [];

  for (const match of anchors) {
    const rawLink = normalizeSearchHref(match[1] || match[2] || "");
    const link = rawLink.split("?")[0].replace("://m.facebook.com/", "://www.facebook.com/");
    if (!link.includes("facebook.com/marketplace/item/")) continue;
    const title = stripHtml(match[3] || "");
    if (!title) continue;
    results.push({ title, link, description: title });
  }

  return results;
}

function extractBraveApiMarketplaceResults(payload: unknown) {
  const webResults = (payload as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } })
    ?.web?.results ?? [];

  return webResults
    .map((item) => ({
      title: item.title?.trim() || "Anuncio do Marketplace",
      link: (item.url ?? "").split("?")[0].replace("://m.facebook.com/", "://www.facebook.com/"),
      description: item.description ?? "",
    }))
    .filter((item) => item.link.includes("facebook.com/marketplace/item/") && item.title);
}

@Injectable()
export class FacebookMarketplaceProvider implements ScraperProvider {
  private readonly logger = new Logger(FacebookMarketplaceProvider.name);
  private browser: Browser | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: [
          "--no-sandbox",
          "--disable-setuid-sandbox",
          "--disable-dev-shm-usage",
          "--disable-gpu",
          "--disable-blink-features=AutomationControlled", // Remove flag de automação
          "--disable-infobars",
          "--window-position=0,0",
          "--ignore-certificate-errors",
          "--ignore-certificate-errors-spki-list",
        ],
      });
    }
    return this.browser;
  }

  async scrape(searchQuery: string, maxResults = 10): Promise<ScrapedBusiness[]> {
    const browser = await this.getBrowser();
    const context = await browser.newContext({
      userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
      locale: "pt-BR",
      timezoneId: "America/Sao_Paulo",
      viewport: { width: 1366, height: 768 },
    });

    // Injeta scripts de evasão de bot para mascarar Playwright
    await context.addInitScript(() => {
      Object.defineProperty(navigator, "webdriver", { get: () => undefined });
      (window as any).chrome = { runtime: {} };
      const originalQuery = window.navigator.permissions.query;
      window.navigator.permissions.query = (parameters) =>
        parameters.name === "notifications"
          ? Promise.resolve({ state: Notification.permission } as PermissionStatus)
          : originalQuery(parameters);
    });

    const page = await context.newPage();

    try {
      const cleanQuery = searchQuery.replace(/[\x00-\x1f<>"'`]/g, "").trim();
      const url = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(cleanQuery)}`;

      this.logger.log(`Navegando no Facebook Marketplace com evasão ativa: "${url}"`);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      // Simula uma rolagem sutil no grid de anúncios
      await page.evaluate(async () => {
        window.scrollBy(0, 400);
        await new Promise((r) => setTimeout(r, 1200));
        window.scrollBy(0, -200);
      });

      await page.waitForTimeout(4000);

      // Extrai os anúncios listados na tela
      const items = await page.$$eval('a[href*="/marketplace/item/"]', (anchors) => {
        const seen = new Set<string>();
        const results: { title: string; link: string; price: string }[] = [];

        for (const a of anchors) {
          const link = (a as HTMLAnchorElement).href || "";
          const cleanLink = link.split("?")[0];
          if (seen.has(cleanLink)) continue;
          seen.add(cleanLink);

          const parent = a.parentElement;
          let title = "";
          let price = "";

          if (parent) {
            const textElements = Array.from(parent.querySelectorAll("span"));
            const priceEl = textElements.find(
              (el) =>
                el.textContent?.includes("R$") || /^\d[\d.,]*\s*$/.test(el.textContent || ""),
            );
            price = priceEl?.textContent?.trim() ?? "";

            const nonPriceTexts = textElements.filter(
              (el) => el.textContent && el.textContent.trim() !== price,
            );
            if (nonPriceTexts.length > 0) {
              title = nonPriceTexts.reduce((max, el) => {
                const t = el.textContent?.trim() || "";
                return t.length > max.length ? t : max;
              }, "");
            }
          }

          if (!title) {
            title = a.textContent?.trim() || "Anúncio do Marketplace";
          }

          results.push({
            title: title.substring(0, 150),
            link: cleanLink,
            price,
          });
        }
        return results;
      });

      this.logger.log(`Facebook Marketplace retornou ${items.length} anúncios no grid principal.`);

      // Roda uma pré-filtragem inteligente por relevância para evitar carregar links de lixo
      const queryTokens = cleanQuery.toLowerCase().split(/\s+/).filter((t) => t.length > 2);
      const scoredItems = items
        .map((item) => {
          let score = 0;
          const lowerTitle = item.title.toLowerCase();
          for (const token of queryTokens) {
            if (lowerTitle.includes(token)) score += 5;
          }
          return { item, score };
        })
        .filter((entry) => entry.score > 0 || queryTokens.length === 0)
        .sort((a, b) => b.score - a.score)
        .map((entry) => entry.item);

      this.logger.log(`Filtrados ${scoredItems.length} anúncios mais relevantes para a busca.`);

      if (scoredItems.length === 0) {
        this.logger.warn("Marketplace nao retornou anuncios visiveis; usando fallback DuckDuckGo indexado.");
        const indexedLeads = await this.searchIndexedMarketplaceItems(page, cleanQuery, maxResults);
        await page.close();
        await context.close();
        return indexedLeads;
      }

      const finalLeads: ScrapedBusiness[] = [];
      const itemsToScrape = scoredItems.slice(0, Math.min(maxResults, 6)); // Limite de 6 requisições de detalhes para não disparar bans de IP

      const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

      for (const item of itemsToScrape) {
        try {
          // Cadenciamento (Smart Pacing): Atraso aleatório antes de acessar o detalhe (Jitter)
          const jitterDelay = 4000 + Math.random() * 6000; // Entre 4s e 10s
          this.logger.log(`Aguardando ${(jitterDelay / 1000).toFixed(1)}s de intervalo cadenciado...`);
          await delay(jitterDelay);

          this.logger.log(`Acessando detalhes do anúncio: ${item.title}`);
          const detailPage = await context.newPage();

          // Injeta evasão de bot na nova aba
          await detailPage.addInitScript(() => {
            Object.defineProperty(navigator, "webdriver", { get: () => undefined });
          });

          const response = await detailPage.goto(item.link, {
            waitUntil: "domcontentloaded",
            timeout: 25000,
          });

          // Detecção de Login Wall ou Captcha
          const currentUrl = detailPage.url();
          if (currentUrl.includes("/login") || currentUrl.includes("/checkpoint") || response?.status() === 429) {
            this.logger.warn(`Detectado Login Wall ou Bloqueio do Facebook. Abortando navegação desse link.`);
            await detailPage.close().catch(() => undefined);
            // Aplica um cooldown de descanso maior
            await delay(12000);
            
            // Adiciona com dados básicos para não perder o lead
            finalLeads.push({
              name: item.title,
              address: "Marketplace - Anunciante",
              phone: "",
              website: "",
              rating: "N/A",
              hasWebsite: false,
              referenceLink: item.link,
              source: "facebook_marketplace",
              category: `Preço: ${item.price} (Bloqueio de visualização da descrição)`,
            });
            continue;
          }

          // Simulação de leitura de usuário: Pequenos scrolls lentos e aleatórios
          await detailPage.evaluate(async () => {
            window.scrollBy(0, 150);
            await new Promise((r) => setTimeout(r, 1000));
            window.scrollBy(0, 200);
            await new Promise((r) => setTimeout(r, 800));
            window.scrollBy(0, -100);
          });

          await detailPage.waitForTimeout(2000);

          // Captura a descrição do anúncio
          const rawDescription = await detailPage.evaluate(() => {
            const selectors = [
              '[style*="webkit-line-clamp"]',
              '.xz9dl7a.xsag5q8',
              'span:has-text("Descrição")',
              'div:has-text("Descrição")',
            ];

            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) {
                if (el.textContent === "Descrição" && el.nextElementSibling) {
                  return el.nextElementSibling.textContent || "";
                }
                return el.textContent || "";
              }
            }

            const spans = Array.from(document.querySelectorAll("span"));
            const largeTexts = spans
              .map((s) => s.textContent?.trim() || "")
              .filter((t) => t.length > 40 && !t.includes("Facebook") && !t.includes("Termos"));
            return largeTexts.join("\n");
          });

          await detailPage.close().catch(() => undefined);

          finalLeads.push({
            name: item.title,
            address: `Marketplace - Anunciante`,
            phone: "",
            website: "",
            rating: "N/A",
            hasWebsite: false,
            referenceLink: item.link,
            source: "facebook_marketplace",
            category: `Preço: ${item.price}\nDescrição do anúncio:\n${rawDescription}`,
          });
        } catch (detailError) {
          this.logger.warn(`Erro ao carregar detalhes do anúncio ${item.link}: ${detailError}`);
          finalLeads.push({
            name: item.title,
            address: "Marketplace - Anunciante",
            phone: "",
            website: "",
            rating: "N/A",
            hasWebsite: false,
            referenceLink: item.link,
            source: "facebook_marketplace",
            category: `Preço: ${item.price}`,
          });
        }
      }

      if (finalLeads.length === 0) {
        this.logger.warn("Marketplace nao gerou leads nos detalhes; usando fallback DuckDuckGo indexado.");
        const indexedLeads = await this.searchIndexedMarketplaceItems(page, cleanQuery, maxResults);
        await page.close();
        await context.close();
        return indexedLeads;
      }

      await page.close();
      await context.close();
      return finalLeads;
    } catch (error) {
      this.logger.error(`Erro ao raspar Marketplace do Facebook: ${error}`);
      await page.close().catch(() => undefined);
      await context.close().catch(() => undefined);
      return [];
    }
  }

  private async searchIndexedMarketplaceItems(page: Page, searchQuery: string, maxResults: number): Promise<ScrapedBusiness[]> {
    const cleanQuery = searchQuery.replace(/\bsem\s+site\b/gi, " ")
      .replace(/\bsem\s+cat\S*logo\s+online\b/gi, " ")
      .replace(/\bsite:facebook\.com\/marketplace\/item\b/gi, " ")
      .replace(/\bfacebook\.com\/marketplace\/item\b/gi, " ")
      .replace(/\s+/g, " ")
      .trim();
    const dorkQuery = `site:facebook.com/marketplace/item ${cleanQuery}`;
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorkQuery)}`;

    this.logger.log(`Buscando Marketplace indexado no DuckDuckGo: "${dorkQuery}"`);
    const response = await page.goto(url, { waitUntil: "domcontentloaded", timeout: 45000 });

    const results = response && [403, 429].includes(response.status())
      ? []
      : await page.$$eval(".result", (elements) => {
          return elements
            .map((el) => {
              const titleEl = el.querySelector(".result__title a");
              const descriptionEl = el.querySelector(".result__snippet");
              const rawLink = (titleEl as HTMLAnchorElement)?.href ?? "";

              let link = rawLink;
              try {
                if (rawLink.includes("uddg=")) {
                  const urlObj = new URL(rawLink);
                  link = urlObj.searchParams.get("uddg") || rawLink;
                }
              } catch {
                /* ignore */
              }

              return {
                title: titleEl?.textContent?.trim() ?? "",
                link: link.split("?")[0],
                description: descriptionEl?.textContent?.trim() ?? "",
              };
            })
            .filter((item) => item.link.includes("facebook.com/marketplace/item") && item.title);
        }).catch(() => []);

    if (response && [403, 429].includes(response.status())) {
      this.logger.warn(`DuckDuckGo bloqueou Marketplace indexado com status ${response.status()}; usando fallback.`);
    }

    const seen = new Set<string>();
    const leads: ScrapedBusiness[] = [];

    for (const item of results) {
      if (seen.has(item.link)) continue;
      seen.add(item.link);
      leads.push({
        name: cleanMarketplaceIndexedTitle(item.title, item.link).substring(0, 150),
        address: "Marketplace - Resultado indexado",
        phone: "",
        website: "",
        rating: "N/A",
        hasWebsite: false,
        referenceLink: item.link,
        source: "facebook_marketplace",
        category: item.description || `Resultado indexado no DuckDuckGo para ${cleanQuery}`,
      });
      if (leads.length >= maxResults) break;
    }

    this.logger.log(`DuckDuckGo retornou ${leads.length} anuncios indexados do Marketplace.`);

    if (leads.length < maxResults) {
      const braveLeads = await this.searchBraveIndexedMarketplaceItems(
        cleanQuery,
        maxResults - leads.length,
        seen,
      );
      leads.push(...braveLeads);
    }

    return leads;
  }

  private async searchBraveIndexedMarketplaceItems(
    searchQuery: string,
    maxResults: number,
    seen: Set<string>,
  ): Promise<ScrapedBusiness[]> {
    const leads: ScrapedBusiness[] = [];
    const queries = [
      `marketplace ${searchQuery} site:facebook.com/marketplace/item`,
      `facebook.com/marketplace/item ${searchQuery}`,
      `facebook marketplace ${searchQuery}`,
    ];

    for (const query of queries) {
      this.logger.log(`Buscando Marketplace indexado no Brave Search: "${query}"`);
      const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&source=web`;

      try {
        const apiResults = await this.searchBraveApiMarketplaceResults(query);
        const results = apiResults.length > 0 ? apiResults : await this.searchPublicBraveMarketplaceResults(url);

        for (const item of results) {
          if (seen.has(item.link)) continue;
          seen.add(item.link);
          leads.push({
            name: cleanMarketplaceIndexedTitle(item.title, item.link).substring(0, 150),
            address: "Marketplace - Resultado indexado",
            phone: "",
            website: "",
            rating: "N/A",
            hasWebsite: false,
            referenceLink: item.link,
            source: "facebook_marketplace",
            category: item.description || `Resultado indexado no Brave Search para ${searchQuery}`,
          });
          if (leads.length >= maxResults) break;
        }
      } catch (error) {
        this.logger.warn(`Brave Search falhou para Marketplace com "${query}": ${error}`);
      }

      if (leads.length >= maxResults) break;
    }

    this.logger.log(`Brave Search retornou ${leads.length} anuncios indexados do Marketplace.`);
    return leads;
  }

  private async searchBraveApiMarketplaceResults(query: string) {
    const token = this.config.get<string>("BRAVE_SEARCH_API_KEY") || this.config.get<string>("BRAVE_API_KEY");
    if (!token) return [];

    const url = new URL("https://api.search.brave.com/res/v1/web/search");
    url.searchParams.set("q", query);
    url.searchParams.set("country", "BR");
    url.searchParams.set("search_lang", "pt");
    url.searchParams.set("ui_lang", "pt-BR");
    url.searchParams.set("count", "20");

    const response = await fetch(url, {
      headers: {
        Accept: "application/json",
        "X-Subscription-Token": token,
      },
    });

    if (!response.ok) {
      this.logger.warn(`Brave Search API falhou para Marketplace com status ${response.status}.`);
      return [];
    }

    return extractBraveApiMarketplaceResults(await response.json());
  }

  private async searchPublicBraveMarketplaceResults(url: string) {
    const response = await fetch(url, { headers: SEARCH_HEADERS });
    if (!response.ok) {
      this.logger.warn(`Brave Search publico falhou para Marketplace com status ${response.status}.`);
      return [];
    }

    return extractIndexedMarketplaceResults(await response.text());
  }

  async close(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
