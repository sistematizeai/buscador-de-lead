import { Injectable, Logger } from "@nestjs/common";
import { chromium, Browser } from "playwright";
import type { ScrapedBusiness, ScraperProvider } from "../scraper-provider.interface";

@Injectable()
export class InstagramDorkProvider implements ScraperProvider {
  private readonly logger = new Logger(InstagramDorkProvider.name);
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

    await page.setExtraHTTPHeaders({
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    });
    await page.setViewportSize({ width: 1280, height: 800 });

    try {
      // Monta a pesquisa do Google direcionando perfis do Instagram
      const cleanQuery = searchQuery.replace(/[\x00-\x1f<>"'`]/g, "").trim();
      const dorkQuery = `site:instagram.com "${cleanQuery}"`;
      
      this.logger.log(`Iniciando dorking no Google para Instagram: "${dorkQuery}"`);
      
      // Codifica a busca na URL do Google
      const url = `https://www.google.com/search?q=${encodeURIComponent(dorkQuery)}&num=${maxResults * 2}`;
      await page.goto(url, {
        waitUntil: "domcontentloaded",
        timeout: 45000,
      });

      // Aguarda os resultados de pesquisa carregarem
      await page.waitForSelector("#search", { timeout: 10000 }).catch(() => undefined);

      // Extrai os snippets e dados dos resultados orgânicos
      const results = await page.$$eval("#rso .g, #rso .MjjYud", (elements) => {
        return elements.map((el) => {
          const titleEl = el.querySelector("h3");
          const linkEl = el.querySelector("a[href]");
          
          // O snippet de descrição do Google costuma estar nas classes VwiC3b, yXK7lf ou similares dentro do resultado
          const descriptionSels = [".VwiC3b", ".Yy3h2c", ".yXK7lf", ".MUFPAc", "span"];
          let description = "";
          for (const sel of descriptionSels) {
            const descEl = el.querySelector(sel);
            if (descEl?.textContent?.trim()) {
              description = descEl.textContent.trim();
              break;
            }
          }

          const title = titleEl?.textContent?.trim() ?? "";
          const link = (linkEl as HTMLAnchorElement)?.href ?? "";

          return { title, link, description };
        }).filter(item => item.link.includes("instagram.com/") && item.title);
      });

      this.logger.log(`Google retornou ${results.length} links do Instagram.`);

      const scraped: ScrapedBusiness[] = results.map((res) => {
        // Limpa o nome comercial a partir do título do Google:
        // Ex: "Clínica Odonto Pinheiros (@odontopinheiros) • Instagram..." -> "Clínica Odonto Pinheiros"
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
          phone: "", // Será populado pela IA analisando a Bio/Description
          website: "", // Será populado pela IA analisando a Bio/Description
          rating: "N/A",
          hasWebsite: false,
          referenceLink: res.link,
          source: "instagram",
          // Salvamos o texto bruto na propriedade extra para a IA analisar
          category: res.description, // Usamos temporariamente para transportar o texto bruto
        };
      });

      await page.close();
      return scraped.slice(0, maxResults);
    } catch (error) {
      this.logger.error(`Erro no dorking do Instagram: ${error}`);
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
