import { Body, Controller, Get, Post, Req, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import type { Request } from "express";
import { JwtGuard } from "../auth/jwt.guard";
import { PermissionsGuard } from "../auth/permissions.guard";
import { RequirePermissions } from "../auth/permissions";
import { CurrentUser, type SecurityContext } from "../auth/current-user.decorator";
import { CompanySearchDto } from "./dto/company-search.dto";
import { SaveCompanyToCrmDto } from "./dto/save-company-to-crm.dto";
import { CompanySearchService } from "./company-search.service";

@ApiTags("Localizar Empresa")
@ApiBearerAuth()
@UseGuards(JwtGuard, PermissionsGuard)
@Controller("company-search")
export class CompanySearchController {
  constructor(private readonly companySearch: CompanySearchService) {}

  @Post()
  @ApiOperation({ summary: "Localiza uma empresa individualmente sem salvar no CRM" })
  @RequirePermissions("company_search.use")
  search(@Body() dto: CompanySearchDto, @CurrentUser() user: SecurityContext, @Req() req: Request) {
    return this.companySearch.search(dto, {
      userId: user.userId,
      workspaceId: user.workspaceId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }

  @Get("history")
  @ApiOperation({ summary: "Lista histórico de buscas do workspace" })
  @RequirePermissions("company_search.view_history")
  history(@CurrentUser() user: SecurityContext) {
    return this.companySearch.history(user.workspaceId);
  }

  @Post("save-to-crm")
  @ApiOperation({ summary: "Adiciona manualmente uma empresa localizada ao CRM" })
  @RequirePermissions("company_search.save_to_crm", "crm.create")
  saveToCrm(@Body() dto: SaveCompanyToCrmDto, @CurrentUser() user: SecurityContext, @Req() req: Request) {
    return this.companySearch.saveToCrm(dto, {
      userId: user.userId,
      workspaceId: user.workspaceId,
      ipAddress: req.ip,
      userAgent: req.headers["user-agent"],
    });
  }
}
