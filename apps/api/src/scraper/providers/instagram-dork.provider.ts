import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { chromium, Browser } from "playwright";
import type { ScrapedBusiness, ScraperProvider } from "../scraper-provider.interface";

export interface InstagramSearchResult {
  title: string;
  link: string;
  description?: string;
}

const IG_RESERVED_PATHS = new Set([
  "about",
  "accounts",
  "api",
  "developer",
  "directory",
  "explore",
  "p",
  "reel",
  "reels",
  "stories",
  "tags",
  "tv",
]);

const SEARCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
  "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
  Accept: "text/html,application/xhtml+xml",
};

function normalizeText(value?: string) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function tokenize(value?: string) {
  return normalizeText(value)
    .split(/\s+/)
    .filter((token) => token.length > 2);
}

function buildInstagramDorkQueries(searchQuery: string) {
  const cleanQuery = stripCatalogTargeting(searchQuery);
  const compactQuery = cleanQuery
    .replace(/\b(instagram|perfil|loja)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const importantTokens = tokenize(compactQuery).slice(0, 8).join(" ");
  const exclusions = "-inurl:/p/ -inurl:/reel/ -inurl:/reels/ -inurl:/explore/ -inurl:/stories/";

  return unique([
    `site:instagram.com ${cleanQuery} ${exclusions}`,
    `site:instagram.com "${compactQuery}" ${exclusions}`,
    importantTokens ? `site:instagram.com ${importantTokens} ${exclusions}` : "",
    `site:instagram.com ${compactQuery} perfil ${exclusions}`,
  ].map((query) => query.replace(/\s+/g, " ").trim()).filter(Boolean));
}

function buildInstagramIndexedQueries(searchQuery: string) {
  const cleanQuery = stripCatalogTargeting(searchQuery);
  const compactQuery = cleanQuery
    .replace(/\b(instagram|perfil|loja)\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
  const importantTokens = tokenize(compactQuery).slice(0, 8).join(" ");

  return unique([
    `${compactQuery} instagram`,
    `instagram ${compactQuery}`,
    `site:instagram.com ${compactQuery}`,
    importantTokens ? `${importantTokens} instagram` : "",
  ].map((query) => query.replace(/\s+/g, " ").trim()).filter(Boolean));
}

function stripCatalogTargeting(query: string) {
  return query
    .replace(/\bsite:instagram\.com\b/gi, " ")
    .replace(/\bsem\s+site\b/gi, " ")
    .replace(/\bsem\s+cat\S*logo\s+online\b/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanInstagramLeadName(rawTitle: string, profileUrl: string | null) {
  const username = profileUrl?.split("/").filter(Boolean).pop() ?? "";
  let title = rawTitle.replace(/\s+/g, " ").trim();

  if (rawTitle.includes("  ")) {
    const parts = rawTitle.split(/\s{2,}/).map((part) => part.trim()).filter(Boolean);
    const businessPart = parts.find((part) => !part.toLowerCase().includes("instagram.com"));
    if (businessPart) title = businessPart;
  }

  title = title
    .replace(/^instagram\s+/i, "")
    .replace(/^instagram\.com\s*[\u203a>]\s*/i, "")
    .replace(new RegExp(`^${username.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s+`, "i"), "")
    .split("(@")[0]
    .split("\u2022")[0]
    .split("|")[0]
    .split(" - Instagram")[0]
    .trim();

  return title || username || "Perfil do Instagram";
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

function extractIndexedInstagramResults(html: string): InstagramSearchResult[] {
  const anchors = html.matchAll(/<a\b[^>]*href=(?:"([^"]+)"|'([^']+)')[^>]*>([\s\S]*?)<\/a>/gi);
  const results: InstagramSearchResult[] = [];

  for (const match of anchors) {
    const link = normalizeSearchHref(match[1] || match[2] || "");
    if (!link.includes("instagram.com/")) continue;
    const title = stripHtml(match[3] || "");
    if (!title) continue;
    results.push({ title, link, description: title });
  }

  return results;
}

function extractBraveApiInstagramResults(payload: unknown): InstagramSearchResult[] {
  const webResults = (payload as { web?: { results?: Array<{ title?: string; url?: string; description?: string }> } })
    ?.web?.results ?? [];

  return webResults
    .map((item) => ({
      title: item.title?.trim() || "Perfil do Instagram",
      link: item.url ?? "",
      description: item.description,
    }))
    .filter((item) => item.link.includes("instagram.com/") && item.title);
}

function unique(values: string[]) {
  const seen = new Set<string>();
  return values.filter((value) => {
    const key = normalizeText(value);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export function normalizeInstagramProfileUrl(rawUrl: string): string | null {
  if (!rawUrl) return null;

  try {
    const parsed = new URL(rawUrl);
    const googleTarget = parsed.searchParams.get("q") || parsed.searchParams.get("url");
    if (googleTarget?.includes("instagram.com")) {
      return normalizeInstagramProfileUrl(googleTarget);
    }

    const host = parsed.hostname.replace(/^www\./, "").replace(/^m\./, "");
    if (host !== "instagram.com") return null;

    const [firstSegment] = parsed.pathname
      .split("/")
      .map((part) => decodeURIComponent(part).replace(/^@/, "").trim())
      .filter(Boolean);

    if (!firstSegment) return null;

    const username = firstSegment.toLowerCase();
    if (IG_RESERVED_PATHS.has(username)) return null;
    if (!/^[a-z0-9._]{1,30}$/.test(username)) return null;

    return `https://www.instagram.com/${username}`;
  } catch {
    return null;
  }
}

export function selectBestInstagramProfile(
  results: InstagramSearchResult[],
  businessName: string,
  location?: string,
): string | null {
  const businessTokens = tokenize(businessName);
  const locationTokens = tokenize(location);
  const compactBusiness = businessTokens.join("");
  let best: { url: string; score: number } | null = null;

  for (const result of results) {
    const url = normalizeInstagramProfileUrl(result.link);
    if (!url) continue;

    const username = url.split("/").pop() ?? "";
    const haystack = normalizeText(`${result.title} ${result.description ?? ""} ${username}`);
    let score = 0;

    for (const token of businessTokens) {
      if (haystack.includes(token)) score += 4;
    }

    for (const token of locationTokens) {
      if (haystack.includes(token)) score += 1;
    }

    if (compactBusiness && (username.includes(compactBusiness) || compactBusiness.includes(username))) {
      score += 8;
    }

    if (result.title.toLowerCase().includes(`@${username}`)) {
      score += 2;
    }

    if (!best || score > best.score) {
      best = { url, score };
    }
  }

  return best && best.score >= 4 ? best.url : null;
}

@Injectable()
export class InstagramDorkProvider implements ScraperProvider {
  private readonly logger = new Logger(InstagramDorkProvider.name);
  private browser: Browser | null = null;

  constructor(private readonly config: ConfigService) {}

  private async getBrowser(): Promise<Browser> {
    if (!this.browser || !this.browser.isConnected()) {
      this.browser = await chromium.launch({
        headless: true,
        args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--disable-gpu"],
      });
    }
    return this.browser;
  }

  async scrape(searchQuery: string, maxResults = 10): Promise<ScrapedBusiness[]> {
    try {
      const results = await this.searchInstagramResults(searchQuery, maxResults * 2);

      const scraped: ScrapedBusiness[] = results.map((res) => {
        const profileUrl = normalizeInstagramProfileUrl(res.link);
        const name = cleanInstagramLeadName(res.title, profileUrl);

        return {
          name,
          address: "Instagram Online",
          phone: "",
          website: "",
          rating: "N/A",
          hasWebsite: false,
          referenceLink: profileUrl || res.link,
          source: "instagram",
          instagramUrl: profileUrl ?? "",
          category: res.description,
        };
      });

      return scraped.slice(0, maxResults);
    } catch (error) {
      this.logger.error(`Erro no dorking do Instagram: ${error}`);
      return [];
    }
  }

  async findProfileForBusiness(input: {
    name: string;
    address?: string | null;
    location?: string | null;
    category?: string | null;
  }): Promise<string | null> {
    const businessName = input.name?.trim();
    if (!businessName) return null;

    const location = input.address || input.location || "";
    const query = [businessName, location, input.category].filter(Boolean).join(" ");

    try {
      const results = await this.searchInstagramResults(query, 8);
      return selectBestInstagramProfile(results, businessName, location);
    } catch (error) {
      this.logger.warn(`Falha ao buscar Instagram para ${businessName}: ${error}`);
      return null;
    }
  }

  private async searchInstagramResults(searchQuery: string, maxResults = 10): Promise<InstagramSearchResult[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
      const cleanQuery = searchQuery.replace(/[\x00-\x1f<>"'`]/g, "").trim();
      const results: InstagramSearchResult[] = [];
      const seen = new Set<string>();

      for (const dorkQuery of buildInstagramDorkQueries(cleanQuery)) {
        this.logger.log(`Iniciando dorking no DuckDuckGo para Instagram: "${dorkQuery}"`);

        const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorkQuery)}`;
        const response = await page.goto(url, {
          waitUntil: "domcontentloaded",
          timeout: 45000,
        });

        if (response && [403, 429].includes(response.status())) {
          this.logger.warn(`DuckDuckGo bloqueou a busca do Instagram com status ${response.status()}; usando fallback.`);
          continue;
        }

        // Aguarda o container de resultados carregar
        await page.waitForSelector(".result", { timeout: 10000 }).catch(() => undefined);

        const pageResults = await page.$$eval(".result", (elements) => {
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

              const title = titleEl?.textContent?.trim() ?? "";
              const description = descriptionEl?.textContent?.trim() ?? "";

              return { title, link, description };
            })
            .filter((item) => item.link.includes("instagram.com/") && item.title);
        });

        for (const item of pageResults) {
          const profileUrl = normalizeInstagramProfileUrl(item.link) || item.link;
          if (seen.has(profileUrl)) continue;
          seen.add(profileUrl);
          results.push(item);
          if (results.length >= maxResults) break;
        }

        if (results.length >= maxResults) break;
      }

      this.logger.log(`DuckDuckGo retornou ${results.length} links do Instagram apÃ³s variaÃ§Ãµes.`);
      if (results.length < maxResults) {
        const indexedResults = await this.searchBraveInstagramResults(
          cleanQuery,
          seen,
          maxResults - results.length,
        );
        results.push(...indexedResults);
      }

      return results.slice(0, maxResults);
    } finally {
      await page.close();
    }
  }

  private async searchBraveInstagramResults(
    searchQuery: string,
    seen: Set<string>,
    remaining: number,
  ): Promise<InstagramSearchResult[]> {
    const results: InstagramSearchResult[] = [];

    for (const indexedQuery of buildInstagramIndexedQueries(searchQuery)) {
      this.logger.log(`Buscando perfis do Instagram no Brave Search: "${indexedQuery}"`);
      const url = `https://search.brave.com/search?q=${encodeURIComponent(indexedQuery)}&source=web`;

      try {
        const apiResults = await this.searchBraveApiInstagramResults(indexedQuery);
        const pageResults = apiResults.length > 0 ? apiResults : await this.searchPublicBraveInstagramResults(url);

        for (const item of pageResults) {
          const profileUrl = normalizeInstagramProfileUrl(item.link);
          if (!profileUrl || seen.has(profileUrl)) continue;
          seen.add(profileUrl);
          results.push({ ...item, link: profileUrl });
          if (results.length >= remaining) break;
        }
      } catch (error) {
        this.logger.warn(`Brave Search falhou para Instagram com "${indexedQuery}": ${error}`);
      }

      if (results.length >= remaining) break;
    }

    this.logger.log(`Brave Search retornou ${results.length} perfis validos do Instagram.`);
    return results;
  }

  private async searchBraveApiInstagramResults(query: string) {
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
      this.logger.warn(`Brave Search API falhou para Instagram com status ${response.status}.`);
      return [];
    }

    return extractBraveApiInstagramResults(await response.json());
  }

  private async searchPublicBraveInstagramResults(url: string) {
    const response = await fetch(url, { headers: SEARCH_HEADERS });
    if (!response.ok) {
      this.logger.warn(`Brave Search publico falhou para Instagram com status ${response.status}.`);
      return [];
    }

    return extractIndexedInstagramResults(await response.text());
  }

  async close(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
