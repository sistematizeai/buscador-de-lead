import { Controller, Get, Patch, Param, Body, Query, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiQuery, ApiBearerAuth } from "@nestjs/swagger";
import { LeadsService } from "./leads.service";
import { UpdateCrmDto } from "./dto/update-crm.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";

@ApiTags("Leads")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("leads")
export class LeadsController {
  constructor(private readonly leadsService: LeadsService) {}

  @Get()
  @ApiOperation({ summary: "Lista todos os leads" })
  @ApiQuery({ name: "campaignId", required: false })
  @RequirePermissions("crm.read")
  findAll(
    @WorkspaceId() workspaceId: string,
    @Query("campaignId") campaignId?: string,
  ) {
    return this.leadsService.findAll(workspaceId, campaignId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Busca lead por ID" })
  @RequirePermissions("crm.read")
  findOne(
    @Param("id") id: string,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.leadsService.findOne(id, workspaceId);
  }

  @Patch(":id/crm")
  @ApiOperation({ summary: "Atualiza o status CRM de um lead" })
  @RequirePermissions("crm.update")
  updateCrm(
    @Param("id") id: string,
    @Body() dto: UpdateCrmDto,
    @WorkspaceId() workspaceId: string,
  ) {
    return this.leadsService.updateCrm(id, dto, workspaceId);
  }
}
