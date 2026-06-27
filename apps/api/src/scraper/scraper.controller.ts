import { Controller, Post, Param, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ScraperProcessor } from "./scraper.processor";
import { CampaignsService } from "../campaigns/campaigns.service";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";

@ApiTags("Scraper")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("scraper")
export class ScraperController {
  constructor(
    private readonly processor: ScraperProcessor,
    private readonly campaigns: CampaignsService,
  ) {}

  @Post("campaigns/:id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Inicia a busca de leads da campanha" })
  async startCampaign(
    @Param("id") id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    const campaign = await this.campaigns.findOne(id, workspaceId);
    // Executa a busca em segundo plano.
    this.processor.process({
      campaignId: campaign.id,
      workspaceId: campaign.workspaceId,
      searchQueries: campaign.searchQueries,
      industry: campaign.industry,
      location: campaign.location,
      maxResults: campaign.maxResults,
      yourService: campaign.yourService,
      contentStyle: campaign.contentStyle,
      language: campaign.language,
      source: campaign.source,
    }).catch((err) => console.error("Falha no scraper:", err));
    return { message: "Campanha iniciada", campaignId: id };
  }
}
