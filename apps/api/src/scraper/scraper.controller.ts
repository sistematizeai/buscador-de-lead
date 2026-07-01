import { Controller, Post, Param, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { ScraperProcessor } from "./scraper.processor";
import { CampaignsService } from "../campaigns/campaigns.service";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";

@ApiTags("Scraper")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("scraper")
export class ScraperController {
  constructor(
    private readonly processor: ScraperProcessor,
    private readonly campaigns: CampaignsService,
  ) {}

  @Post("campaigns/:id/start")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Inicia a busca de leads da campanha" })
  @RequirePermissions("campaigns.run")
  async startCampaign(
    @Param("id") id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    const campaign = await this.campaigns.findOne(id, workspaceId);
    this.enqueueCampaign(campaign);
    return { message: "Campanha iniciada", campaignId: id };
  }

  @Post("campaigns/:id/retry")
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: "Tenta novamente uma campanha que falhou" })
  @RequirePermissions("campaigns.run")
  async retryCampaign(
    @Param("id") id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    const campaign = await this.campaigns.findOne(id, workspaceId);
    this.enqueueCampaign(campaign);
    return { message: "Campanha reenviada para busca", campaignId: id };
  }

  private enqueueCampaign(campaign: {
    id: string;
    workspaceId: string;
    searchQueries: string[];
    industry: string;
    location: string;
    maxResults: number;
    yourService: string;
    contentStyle: string;
    language: string;
    source: string;
  }) {
    void this.processor.process({
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
  }
}
