import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { buildCampaignSearchQueries, buildRegionLabel, normalizeCampaignSources } from "./campaign-query-planner";

const DEFAULT_WORKSPACE_ID = "default-workspace";

@Injectable()
export class CampaignsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId = DEFAULT_WORKSPACE_ID) {
    return this.prisma.campaign.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { leads: true } } },
    });
  }

  async findOne(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
    const campaign = await this.prisma.campaign.findFirst({
      where: { id, workspaceId },
      include: { _count: { select: { leads: true } } },
    });
    if (!campaign) throw new NotFoundException(`Campanha ${id} não encontrada`);
    return campaign;
  }

  async create(dto: CreateCampaignDto, workspaceId = DEFAULT_WORKSPACE_ID) {
    const {
      regionConfig: _regionConfig,
      targetWebsiteMode: _targetWebsiteMode,
      sources: _sources,
      ...campaignData
    } = dto;
    const location = _regionConfig ? buildRegionLabel(_regionConfig) || dto.location : dto.location;
    const selectedSources = normalizeCampaignSources(_sources ?? dto.source);
    const searchQueries = buildCampaignSearchQueries({
      industry: dto.industry,
      location,
      searchQueries: dto.searchQueries,
      targetWebsiteMode: _targetWebsiteMode ?? "missing_website",
    });

    await this.prisma.workspace.upsert({
      where: { id: workspaceId },
      create: { id: workspaceId, name: "Workspace padrão", slug: "default" },
      update: {},
    });
    return this.prisma.campaign.create({
      data: {
        ...campaignData,
        location,
        searchQueries,
        maxResults: dto.maxResults ?? 20,
        contentStyle: dto.contentStyle ?? "balanced",
        language: dto.language ?? "portuguese",
        source: selectedSources.join(","),
        workspaceId,
      },
    });
  }

  async update(id: string, dto: UpdateCampaignDto, workspaceId = DEFAULT_WORKSPACE_ID) {
    await this.findOne(id, workspaceId);
    return this.prisma.campaign.update({ where: { id }, data: dto });
  }

  async remove(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
    await this.findOne(id, workspaceId);
    return this.prisma.campaign.delete({ where: { id } });
  }

  async updateStatus(id: string, status: string, progress?: number, error?: string) {
    return this.prisma.campaign.update({
      where: { id },
      data: {
        status,
        ...(progress !== undefined && { progress }),
        ...(error && { error }),
        ...(status === "running" && { startedAt: new Date() }),
        ...(status === "completed" && { completedAt: new Date() }),
      },
    });
  }

  async updateStats(id: string, stats: {
    totalLeads?: number;
    priorityLeads?: number;
    highQualityLeads?: number;
    averageScore?: number;
  }) {
    return this.prisma.campaign.update({ where: { id }, data: stats });
  }
}
