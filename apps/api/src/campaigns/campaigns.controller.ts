import { Controller, Get, Post, Patch, Delete, Body, Param, HttpCode, HttpStatus, UseGuards } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { CampaignsService } from "./campaigns.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { WorkspaceId } from "../auth/current-workspace.decorator";

@ApiTags("Campanhas")
@ApiBearerAuth()
@UseGuards(JwtGuard)
@Controller("campaigns")
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) {}

  @Get()
  @ApiOperation({ summary: "Lista todas as campanhas" })
  findAll(@WorkspaceId() workspaceId: string) {
    return this.campaignsService.findAll(workspaceId);
  }

  @Get(":id")
  @ApiOperation({ summary: "Busca campanha por ID" })
  findOne(@Param("id") id: string, @WorkspaceId() workspaceId: string) {
    return this.campaignsService.findOne(id, workspaceId);
  }

  @Post()
  @ApiOperation({ summary: "Cria uma nova campanha" })
  create(@Body() dto: CreateCampaignDto, @WorkspaceId() workspaceId: string) {
    return this.campaignsService.create(dto, workspaceId);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Atualiza uma campanha" })
  update(@Param("id") id: string, @Body() dto: UpdateCampaignDto) {
    return this.campaignsService.update(id, dto);
  }

  @Delete(":id")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Remove uma campanha" })
  remove(@Param("id") id: string) { return this.campaignsService.remove(id); }
}
