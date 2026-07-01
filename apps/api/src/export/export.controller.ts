import { Controller, Get, Query, Res, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { Response } from "express";
import { ExportService } from "./export.service";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";

@ApiTags("Exportação")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("export")
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get("leads/csv")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exporta leads em CSV" })
  @ApiQuery({ name: "campaignId", required: false })
  @RequirePermissions("crm.export")
  async exportCsv(
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId: string | undefined,
    @Res() res: Response,
  ) {
    const leads = await this.exportService.getLeads(workspaceId, campaignId);
    const csv = this.exportService.toCsv(leads);
    const filename = campaignId ? `leads-campanha-${campaignId}.csv` : "todos-leads.csv";
    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(csv);
  }

  @Get("leads/json")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exporta leads em JSON" })
  @ApiQuery({ name: "campaignId", required: false })
  @RequirePermissions("crm.export")
  async exportJson(
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId: string | undefined,
    @Res() res: Response,
  ) {
    const leads = await this.exportService.getLeads(workspaceId, campaignId);
    const data = this.exportService.toJson(leads);
    const filename = campaignId ? `leads-campanha-${campaignId}.json` : "todos-leads.json";
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(JSON.stringify(data, null, 2));
  }

  @Get("leads/vcard")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exporta leads em vCard (.vcf)" })
  @ApiQuery({ name: "campaignId", required: false })
  @RequirePermissions("crm.export")
  async exportVCard(
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId: string | undefined,
    @Res() res: Response,
  ) {
    const leads = await this.exportService.getLeads(workspaceId, campaignId);
    const vcf = this.exportService.toVCard(leads);
    const filename = campaignId ? `leads-campanha-${campaignId}.vcf` : "todos-leads.vcf";
    res.setHeader("Content-Type", "text/vcard");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(vcf);
  }
}
