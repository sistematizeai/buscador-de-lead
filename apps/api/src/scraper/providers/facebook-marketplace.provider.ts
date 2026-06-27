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
        ],
      });
    }
    return this.browser;
  }

  async scrape(searchQuery: string, maxResults = 10): Promise<ScrapedBusiness[]> {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    // Configura headers limpos para simular usuário real
    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      "Accept-Language": "pt-BR,pt;q=0.9,en;q=0.8",
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
      const cleanQuery = searchQuery.replace(/[\x00-\x1f<>"'`]/g, "").trim();
      // O Facebook Marketplace permite buscar informando a query na URL
      const url = `https://www.facebook.com/marketplace/search/?query=${encodeURIComponent(cleanQuery)}`;
      
      this.logger.log(`Navegando no Facebook Marketplace: "${url}"`);
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      // Aguarda os itens do Grid carregarem. O FB costuma usar classes ou atributos aria para os blocos
      await page.waitForTimeout(5000); // Espera leve para renderização do React/DOM do Facebook

      // Extrai os anúncios listados na tela
      const items = await page.$$eval('a[href*="/marketplace/item/"]', (anchors) => {
        const seen = new Set<string>();
        const results: { title: string; link: string; price: string }[] = [];

        for (const a of anchors) {
          const link = (a as HTMLAnchorElement).href || "";
          // Evita duplicados na listagem
          const cleanLink = link.split("?")[0];
          if (seen.has(cleanLink)) continue;
          seen.add(cleanLink);

          // Tenta extrair o título e o preço que costumam estar dentro do bloco do link
          const parent = a.parentElement;
          let title = "";
          let price = "";

          if (parent) {
            // No FB Marketplace, os textos costumam estar em divs/spans aninhados
            const textElements = Array.from(parent.querySelectorAll("span"));
            // O preço costuma ser um número precedido de R$ ou similar
            const priceEl = textElements.find(el => el.textContent?.includes("R$") || /^\d[\d.,]*\s*$/.test(el.textContent || ""));
            price = priceEl?.textContent?.trim() ?? "";

            // O título costuma ser um texto maior descritivo
            const nonPriceTexts = textElements.filter(el => el.textContent && el.textContent.trim() !== price);
            if (nonPriceTexts.length > 0) {
              // Pega o maior texto comercial que não seja o preço
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

      this.logger.log(`Facebook Marketplace retornou ${items.length} anúncios.`);

      // Para cada anúncio, podemos fazer uma visita rápida opcional para coletar a descrição e os contatos.
      // Limitamos a visitas em lote rápidas para não estourar tempo da campanha.
      const finalLeads: ScrapedBusiness[] = [];
      const itemsToScrape = items.slice(0, maxResults);

      for (const item of itemsToScrape) {
        try {
          this.logger.log(`Acessando detalhes do anúncio: ${item.title}`);
          const detailPage = await browser.newPage();
          await detailPage.goto(item.link, { waitUntil: "domcontentloaded", timeout: 20000 });
          await detailPage.waitForTimeout(2000);

          // Captura o bloco de descrição do anúncio
          const rawDescription = await detailPage.evaluate(() => {
            // O FB costuma conter spans com as palavras da descrição
            const selectors = [
              '[style*="webkit-line-clamp"]',
              '.xz9dl7a.xsag5q8',
              'span:has-text("Descrição")',
              'div:has-text("Descrição")'
            ];
            
            for (const sel of selectors) {
              const el = document.querySelector(sel);
              if (el) {
                // Se for o cabeçalho "Descrição", tenta pegar o irmão seguinte
                if (el.textContent === "Descrição" && el.nextElementSibling) {
                  return el.nextElementSibling.textContent || "";
                }
                return el.textContent || "";
              }
            }

            // Fallback: junta todos os blocos de texto grandes da página do item
            const spans = Array.from(document.querySelectorAll('span'));
            const largeTexts = spans
              .map(s => s.textContent?.trim() || "")
              .filter(t => t.length > 40 && !t.includes("Facebook") && !t.includes("Termos"));
            return largeTexts.join("\n");
          });

          detailPage.close().catch(() => undefined);

          finalLeads.push({
            name: item.title,
            address: `Marketplace - Anunciante`,
            phone: "", // IA irá preencher a partir da descrição
            website: "",
            rating: "N/A",
            hasWebsite: false,
            referenceLink: item.link,
            source: "facebook_marketplace",
            // Passamos a descrição no campo category para ser lida pelo LeadExtractorService
            category: `Preço: ${item.price}\nDescrição do anúncio:\n${rawDescription}`,
          });

        } catch (detailError) {
          this.logger.warn(`Erro ao carregar detalhes do anúncio ${item.link}: ${detailError}`);
          // Se falhar os detalhes, adiciona com as informações básicas do card inicial
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
      return finalLeads;
    } catch (error) {
      this.logger.error(`Erro ao raspar Marketplace do Facebook: ${error}`);
      await page.close();
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
