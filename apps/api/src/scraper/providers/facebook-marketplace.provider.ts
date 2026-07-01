import { Injectable, Logger } from "@nestjs/common";
import { chromium, Browser } from "playwright";
import type { ScrapedBusiness, ScraperProvider } from "../scraper-provider.interface";

@Injectable()
export class FacebookMarketplaceProvider implements ScraperProvider {
  private readonly logger = new Logger(FacebookMarketplaceProvider.name);
  private browser: Browser | null = null;

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

  async close(): Promise<void> {
    if (this.browser?.isConnected()) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

