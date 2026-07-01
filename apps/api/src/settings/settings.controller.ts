import { Controller, Get, Post, Delete, Body, Param, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { SettingsService } from "./settings.service";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";

@ApiTags("Configurações")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get("runtime-status")
  @ApiOperation({ summary: "Status de execução da instalação local" })
  getRuntimeStatus(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getRuntimeStatus(workspaceId);
  }

  @Get("integrations")
  @ApiOperation({ summary: "Lista integrações do workspace" })
  getIntegrations(@WorkspaceId() workspaceId: string) {
    return this.settingsService.getIntegrations(workspaceId);
  }

  @Post("integrations")
  @ApiOperation({ summary: "Salva ou atualiza uma integração" })
  upsertIntegration(
    @WorkspaceId() workspaceId: string,
    @Body() body: { type: string; name: string; config: Record<string, string> },
  ) {
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
  createApiKey(
    @WorkspaceId() workspaceId: string,
    @Body() body: { name: string },
  ) {
    return this.settingsService.createApiKey(body.name, workspaceId);
  }

  @Delete("api-keys/:id")
  @ApiOperation({ summary: "Remove uma chave de API" })
  @RequirePermissions("settings.manage_api_keys")
  deleteApiKey(@Param("id") id: string, @WorkspaceId() workspaceId: string) {
    return this.settingsService.deleteApiKey(id, workspaceId);
  }
}
