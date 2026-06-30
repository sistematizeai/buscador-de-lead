import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateCrmDto } from "./dto/update-crm.dto";
import {
  buildLeadDedupeKey,
  getLeadDuplicateKeys,
  normalizeLeadPhone,
  normalizeLeadText,
  normalizeLeadUrl,
} from "./lead-dedupe";

const DEFAULT_WORKSPACE_ID = "default-workspace";
const CRM_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  replied: "Respondeu",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
};

export interface LeadCreateInput {
  name: string;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  instagramUrl?: string | null;
  rating?: string | null;
  category?: string | null;
  source?: string | null;
  rawTextScraped?: string | null;
  referenceUrl?: string | null;
  dedupeKey?: string | null;
  hasWebsite?: boolean;
  score?: number;
  priority?: string;
  marketingContent?: object | null;
  aiAnalysis?: object | null;
  campaignId: string;
  workspaceId: string;
}

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId = DEFAULT_WORKSPACE_ID, campaignId?: string) {
    return this.prisma.lead.findMany({
      where: { workspaceId, ...(campaignId && { campaignId }) },
      orderBy: [{ priority: "asc" }, { score: "desc" }],
      include: {
        activities: { orderBy: { createdAt: "desc" }, take: 5 },
        campaign: { select: { id: true, name: true } },
      },
    });
  }

  async findOne(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
    const lead = await this.prisma.lead.findFirst({
      where: { id, workspaceId },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        campaign: { select: { id: true, name: true } },
        followUps: { where: { done: false }, orderBy: { scheduledAt: "asc" } },
      },
    });
    if (!lead) throw new NotFoundException(`Lead ${id} não encontrado`);
    return lead;
  }

  async updateCrm(id: string, dto: UpdateCrmDto, workspaceId = DEFAULT_WORKSPACE_ID) {
    await this.findOne(id, workspaceId);
    const now = new Date();
    const lead = await this.prisma.lead.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.crmStatus === "contacted" && { contactedAt: now }),
        ...(dto.crmStatus === "replied" && { repliedAt: now }),
        ...(["won", "lost"].includes(dto.crmStatus ?? "") && { closedAt: now }),
      },
    });
    await this.prisma.leadActivity.create({
      data: {
        leadId: id,
        type: "crm_update",
        note: `Status alterado para ${CRM_LABELS[dto.crmStatus ?? ""] ?? dto.crmStatus}`,
        metadata: dto as object,
      },
    });
    return lead;
  }

  async createMany(leads: LeadCreateInput[], options: { alreadyDeduped?: boolean } = {}) {
    const newLeads = options.alreadyDeduped ? this.removeDuplicateBatchLeads(leads) : await this.filterNewLeads(leads);

    if (newLeads.length === 0) {
      return { count: 0 };
    }

    return this.prisma.lead.createMany({ data: this.withDedupeKeys(newLeads), skipDuplicates: true });
  }

  async filterNewLeads<T extends LeadCreateInput>(leads: T[]): Promise<T[]> {
    const uniqueLeads = this.removeDuplicateBatchLeads(leads);
    if (uniqueLeads.length === 0) return [];

    const leadsByWorkspace = this.groupLeadsByWorkspace(uniqueLeads);
    const existingKeysByWorkspace = new Map(
      await Promise.all(
        Array.from(leadsByWorkspace.entries()).map(async ([workspaceId, workspaceLeads]) => {
          const existingLeads = await this.prisma.lead.findMany({
            where: {
              workspaceId,
              OR: this.buildDuplicateLookupConditions(workspaceLeads),
            },
            select: {
              name: true,
              address: true,
              phone: true,
              website: true,
              instagramUrl: true,
              referenceUrl: true,
              dedupeKey: true,
            },
          });

          return [workspaceId, new Set(existingLeads.flatMap((lead) => this.getLeadDuplicateKeys(lead)))] as const;
        }),
      ),
    );

    return uniqueLeads.filter((lead) => {
      const existingKeys = existingKeysByWorkspace.get(lead.workspaceId);
      return !this.getLeadDuplicateKeys(lead).some((key) => existingKeys?.has(key));
    });
  }

  private withDedupeKeys<T extends LeadCreateInput>(leads: T[]) {
    return leads.map((lead) => ({
      ...lead,
      dedupeKey: lead.dedupeKey || buildLeadDedupeKey(lead),
    }));
  }

  private removeDuplicateBatchLeads<T extends LeadCreateInput>(leads: T[]) {
    const seen = new Set<string>();
    const unique: T[] = [];

    for (const lead of leads) {
      const keys = this.getLeadDuplicateKeys(lead).map((key) => `${lead.workspaceId}:${key}`);
      if (keys.some((key) => seen.has(key))) continue;

      for (const key of keys) seen.add(key);
      unique.push(lead);
    }

    return unique;
  }

  private groupLeadsByWorkspace<T extends LeadCreateInput>(leads: T[]) {
    const grouped = new Map<string, T[]>();

    for (const lead of leads) {
      const items = grouped.get(lead.workspaceId) ?? [];
      items.push(lead);
      grouped.set(lead.workspaceId, items);
    }

    return grouped;
  }

  private buildDuplicateLookupConditions(leads: LeadCreateInput[]) {
    const conditions: object[] = [];
    const addUnique = (condition: object, key: string, seen: Set<string>) => {
      if (seen.has(key)) return;
      seen.add(key);
      conditions.push(condition);
    };
    const seen = new Set<string>();

    for (const lead of leads) {
      const referenceUrl = normalizeLeadUrl(lead.referenceUrl);
      const website = normalizeLeadUrl(lead.website);
      const instagramUrl = normalizeLeadUrl(lead.instagramUrl);
      const phone = normalizeLeadPhone(lead.phone);
      const name = normalizeLeadText(lead.name);
      const address = normalizeLeadText(lead.address);
      const dedupeKey = lead.dedupeKey || buildLeadDedupeKey(lead);

      if (dedupeKey) addUnique({ dedupeKey: { equals: dedupeKey } }, `dedupe:${dedupeKey}`, seen);
      if (name) addUnique({ name: { contains: lead.name.trim(), mode: "insensitive" } }, `name:${name}`, seen);
      if (referenceUrl) addUnique({ referenceUrl: { equals: lead.referenceUrl } }, `ref:${referenceUrl}`, seen);
      if (website) addUnique({ website: { equals: lead.website } }, `site:${website}`, seen);
      if (instagramUrl) addUnique({ instagramUrl: { equals: lead.instagramUrl } }, `ig:${instagramUrl}`, seen);
      if (phone) addUnique({ phone: { equals: lead.phone } }, `phone:${phone}`, seen);
      if (name && address) {
        addUnique({
          AND: [
            { name: { equals: lead.name, mode: "insensitive" } },
            { address: { equals: lead.address, mode: "insensitive" } },
          ],
        }, `name-address:${name}|${address}`, seen);
      }
    }

    return conditions.length > 0 ? conditions : [{ id: "__never__" }];
  }

  private getLeadDuplicateKeys(lead: Pick<LeadCreateInput, "name" | "address" | "phone" | "website" | "instagramUrl" | "referenceUrl" | "dedupeKey">) {
    return getLeadDuplicateKeys(lead);
  }
}
