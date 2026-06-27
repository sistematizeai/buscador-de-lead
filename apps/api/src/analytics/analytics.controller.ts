import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { AnalyticsService } from "./analytics.service";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";

@ApiTags("Análises")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: "Busca resumo de análises" })
  getOverview(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getOverview(workspaceId);
  }

  @Get("industries")
  @ApiOperation({ summary: "Busca leads agrupados por nicho" })
  getByIndustry(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getLeadsByIndustry(workspaceId);
  }

  @Get("campaigns")
  @ApiOperation({ summary: "Busca estatísticas de performance das campanhas" })
  getCampaignStats(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getCampaignStats(workspaceId);
  }
}
