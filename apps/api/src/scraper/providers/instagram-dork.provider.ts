import { Injectable, Logger } from "@nestjs/common";
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
        let name = res.title
          .split("(@")[0]
          .split("•")[0]
          .split("|")[0]
          .split("-")[0]
          .trim();

        if (!name) name = "Perfil do Instagram";

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
      const dorkQuery = `site:instagram.com "${cleanQuery}" -inurl:/p/ -inurl:/reel/ -inurl:/explore/`;

      this.logger.log(`Iniciando dorking no DuckDuckGo para Instagram: "${dorkQuery}"`);

      const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(dorkQuery)}`;
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      // Aguarda o container de resultados carregar
      await page.waitForSelector(".result", { timeout: 10000 }).catch(() => undefined);

      const results = await page.$$eval(".result", (elements) => {
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

      this.logger.log(`DuckDuckGo retornou ${results.length} links do Instagram.`);
      return results.slice(0, maxResults);
    } finally {
      await page.close();
    }
  }

  async close(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }
}
