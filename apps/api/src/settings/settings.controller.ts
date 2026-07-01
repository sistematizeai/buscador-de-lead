import { Body, Controller, Delete, Get, Param, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { CurrentUser, type SecurityContext } from "../auth/current-user.decorator";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { RateLimitService } from "../security/rate-limit.service";
import { SettingsService } from "./settings.service";

@ApiTags("Configuracoes")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("settings")
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly rateLimit: RateLimitService,
  ) {}

  @Get("runtime-status")
  @ApiOperation({ summary: "Status de execucao da instalacao" })
  @RequirePermissions("settings.read")
  getRuntimeStatus(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getRuntimeStatus(workspaceId);
  }

  @Get("integrations")
  @ApiOperation({ summary: "Lista integracoes do workspace" })
  @RequirePermissions("settings.read")
  getIntegrations(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getIntegrations(workspaceId);
  }

  @Post("integrations")
  @ApiOperation({ summary: "Salva ou atualiza uma integracao" })
  @RequirePermissions("settings.manage_integrations")
  async upsertIntegration(
    @CurrentUser() user: SecurityContext,
    @WorkspaceId() workspaceId: string,
    @Body() body: { type: string; name: string; config: Record<string, string> },
    @Req() req: Request,
  ) {
    await this.assertAdminRateLimit(user, req, "settings.manage_integrations", "POST /settings/integrations");
    return this.settingsService.upsertIntegration(body.type, body.name, body.config, workspaceId);
  }

  @Get("api-keys")
  @ApiOperation({ summary: "Lista chaves de API" })
  @RequirePermissions("settings.manage_api_keys")
  listApiKeys(@WorkspaceId() workspaceId: string) {
    return this.settingsService.listApiKeys(workspaceId);
  }

  @Post("api-keys")
  @ApiOperation({ summary: "Cria uma nova chave de API" })
  @RequirePermissions("settings.manage_api_keys")
  async createApiKey(
    @CurrentUser() user: SecurityContext,
    @WorkspaceId() workspaceId: string,
    @Body() body: { name: string },
    @Req() req: Request,
  ) {
    await this.assertAdminRateLimit(user, req, "settings.create_api_key", "POST /settings/api-keys");
    return this.settingsService.createApiKey(body.name, workspaceId);
  }

  @Delete("api-keys/:id")
  @ApiOperation({ summary: "Remove uma chave de API" })
  @RequirePermissions("settings.manage_api_keys")
  async deleteApiKey(
    @CurrentUser() user: SecurityContext,
    @Param("id") id: string,
    @WorkspaceId() workspaceId: string,
    @Req() req: Request,
  ) {
    await this.assertAdminRateLimit(user, req, "settings.delete_api_key", "DELETE /settings/api-keys/:id");
    return this.settingsService.deleteApiKey(id, workspaceId);
  }

  private assertAdminRateLimit(user: SecurityContext, req: Request, action: string, endpoint: string) {
    return this.rateLimit.assertAllowed({
      key: `${action}:user:${user.userId}`,
      action,
      scope: "user",
      limit: 10,
      windowMs: 60 * 60 * 1000,
      userId: user.userId,
      workspaceId: user.workspaceId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
      endpoint,
    });
  }
}
