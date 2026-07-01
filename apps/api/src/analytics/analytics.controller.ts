import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { AnalyticsService } from "./analytics.service";

@ApiTags("Analises")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("analytics")
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get()
  @ApiOperation({ summary: "Busca resumo de analises" })
  @RequirePermissions("analytics.read")
  getOverview(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getOverview(workspaceId);
  }

  @Get("industries")
  @ApiOperation({ summary: "Busca leads agrupados por nicho" })
  @RequirePermissions("analytics.read")
  getByIndustry(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getLeadsByIndustry(workspaceId);
  }

  @Get("campaigns")
  @ApiOperation({ summary: "Busca estatisticas de performance das campanhas" })
  @RequirePermissions("analytics.read")
  getCampaignStats(@WorkspaceId() workspaceId: string) {
    return this.analyticsService.getCampaignStats(workspaceId);
  }
}
