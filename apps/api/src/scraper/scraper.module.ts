import { Module } from "@nestjs/common";
import { ScraperController } from "./scraper.controller";
import { ScraperProcessor } from "./scraper.processor";
import { GoogleMapsScraperService } from "./google-maps.scraper";
import { GosomGoogleMapsProvider } from "./providers/gosom-google-maps.provider";
import { InstagramDorkProvider } from "./providers/instagram-dork.provider";
import { FacebookMarketplaceProvider } from "./providers/facebook-marketplace.provider";
import { CampaignsModule } from "../campaigns/campaigns.module";
import { LeadsModule } from "../leads/leads.module";
import { AiModule } from "../ai/ai.module";
import { AuthModule } from "../auth/auth.module";

@Module({
  imports: [CampaignsModule, LeadsModule, AiModule, AuthModule],
  controllers: [ScraperController],
  providers: [
    ScraperProcessor,
    GoogleMapsScraperService,
    GosomGoogleMapsProvider,
    InstagramDorkProvider,
    FacebookMarketplaceProvider,
  ],
})
export class ScraperModule {}
