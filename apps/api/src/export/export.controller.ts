import { Controller, Get, Query, Res, HttpCode, HttpStatus, UseGuards, Req } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { Request, Response } from "express";
import { ExportService } from "./export.service";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";
import { CurrentUser, type SecurityContext } from "../auth/current-user.decorator";
import { RateLimitService } from "../security/rate-limit.service";

@ApiTags("Exportação")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("export")
export class ExportController {
  constructor(
    private readonly exportService: ExportService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get("leads/csv")
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Exporta leads em CSV" })
  @ApiQuery({ name: "campaignId", required: false })
  @RequirePermissions("crm.export")
  async exportCsv(
    @CurrentUser() user: SecurityContext,
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.assertExportAllowed(user, req, "csv");
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
    @CurrentUser() user: SecurityContext,
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.assertExportAllowed(user, req, "json");
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
    @CurrentUser() user: SecurityContext,
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    await this.assertExportAllowed(user, req, "vcard");
    const leads = await this.exportService.getLeads(workspaceId, campaignId);
    const vcf = this.exportService.toVCard(leads);
    const filename = campaignId ? `leads-campanha-${campaignId}.vcf` : "todos-leads.vcf";
    res.setHeader("Content-Type", "text/vcard");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.send(vcf);
  }

  private assertExportAllowed(user: SecurityContext, req: Request, format: string) {
    return this.rateLimit.assertAllowed({
      key: `crm.export:user:${user.userId}`,
      action: "crm.export",
      scope: "user",
      limit: 5,
      windowMs: 60 * 60 * 1000,
      userId: user.userId,
      workspaceId: user.workspaceId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      endpoint: `GET /export/leads/${format}`,
    });
  }
}
