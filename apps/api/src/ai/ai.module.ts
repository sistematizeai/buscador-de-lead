import { Module } from "@nestjs/common";
import { LeadIntelligenceService } from "./lead-intelligence.service";
import { MarketingAiService } from "./marketing-ai.service";
import { LeadExtractorService } from "./lead-extractor.service";

@Module({
  providers: [LeadIntelligenceService, MarketingAiService, LeadExtractorService],
  exports: [LeadIntelligenceService, MarketingAiService, LeadExtractorService],
})
export class AiModule {}
