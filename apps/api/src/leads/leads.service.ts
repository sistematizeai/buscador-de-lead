import { Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
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
  potential_customer: "Potencial Cliente",
  contacted: "Contatado",
  qualified: "Qualificado",
  proposal: "Proposta Enviada",
  negotiation: "Negociacao",
  won: "Ganho",
  not_interested: "Sem Interesse",
  lost: "Perdido",
  archived: "Arquivado",
};

export interface LeadCreateInput {
  name: string;
  tradeName?: string | null;
  cnpj?: string | null;
  businessStatus?: string | null;
  industry?: string | null;
  cnae?: string | null;
  address?: string | null;
  zipCode?: string | null;
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
  campaignId?: string | null;
  workspaceId: string;
  searchOrigin?: string | null;
  searchProvider?: string | null;
  assignedUserId?: string | null;
  tags?: string[];
  crmStatus?: string;
  crmNotes?: string | null;
}

@Injectable()
export class LeadsService {
  constructor(private prisma: PrismaService) {}

  async findAll(workspaceId = DEFAULT_WORKSPACE_ID, campaignId?: string) {
    return this.prisma.withWorkspace(workspaceId, (db) =>
      db.lead.findMany({
        where: { workspaceId, ...(campaignId && { campaignId }) },
        orderBy: [{ priority: "asc" }, { score: "desc" }],
        include: {
          activities: { orderBy: { createdAt: "desc" }, take: 5 },
          campaign: { select: { id: true, name: true } },
        },
      }),
    );
  }

  async findOne(id: string, workspaceId = DEFAULT_WORKSPACE_ID) {
    const lead = await this.prisma.withWorkspace(workspaceId, (db) => this.findOneInWorkspace(db, id, workspaceId));
    if (!lead) throw new NotFoundException(`Lead ${id} nao encontrado`);
    return lead;
  }

  async updateCrm(id: string, dto: UpdateCrmDto, workspaceId = DEFAULT_WORKSPACE_ID) {
    const now = new Date();
    const lead = await this.prisma.withWorkspace(workspaceId, async (db) => {
      const updated = await db.lead.updateMany({
        where: { id, workspaceId },
        data: {
          ...dto,
          ...(dto.crmStatus === "contacted" && { contactedAt: now }),
          ...(dto.crmStatus === "qualified" && { repliedAt: now }),
          ...(["won", "lost"].includes(dto.crmStatus ?? "") && { closedAt: now }),
        },
      });
      if (updated.count !== 1) throw new NotFoundException(`Lead ${id} nao encontrado`);
      await db.leadActivity.create({
        data: {
          leadId: id,
          type: "crm_update",
          note: `Status alterado para ${CRM_LABELS[dto.crmStatus ?? ""] ?? dto.crmStatus}`,
          metadata: dto as object,
        },
      });
      return this.findOneInWorkspace(db, id, workspaceId);
    });
    if (!lead) throw new NotFoundException(`Lead ${id} nao encontrado`);
    return lead;
  }

  async createMany(leads: LeadCreateInput[], options: { alreadyDeduped?: boolean } = {}) {
    const newLeads = options.alreadyDeduped ? this.removeDuplicateBatchLeads(leads) : await this.filterNewLeads(leads);

    if (newLeads.length === 0) {
      return { count: 0 };
    }

    const grouped = this.groupLeadsByWorkspace(this.withDedupeKeys(newLeads));
    const results = await Promise.all(
      Array.from(grouped.entries()).map(([workspaceId, workspaceLeads]) =>
        this.prisma.withWorkspace(workspaceId, (db) =>
          db.lead.createMany({ data: workspaceLeads, skipDuplicates: true }),
        ),
      ),
    );

    return { count: results.reduce((total, result) => total + result.count, 0) };
  }

  async filterNewLeads<T extends LeadCreateInput>(leads: T[]): Promise<T[]> {
    const uniqueLeads = this.removeDuplicateBatchLeads(leads);
    if (uniqueLeads.length === 0) return [];

    const leadsByWorkspace = this.groupLeadsByWorkspace(uniqueLeads);
    const existingKeysByWorkspace = new Map(
      await Promise.all(
        Array.from(leadsByWorkspace.entries()).map(async ([workspaceId, workspaceLeads]) => {
          const existingLeads = await this.prisma.withWorkspace(workspaceId, (db) =>
            db.lead.findMany({
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
                cnpj: true,
              },
            }),
          );

          return [workspaceId, new Set(existingLeads.flatMap((lead) => this.getLeadDuplicateKeys(lead)))] as const;
        }),
      ),
    );

    return uniqueLeads.filter((lead) => {
      const existingKeys = existingKeysByWorkspace.get(lead.workspaceId);
      return !this.getLeadDuplicateKeys(lead).some((key) => existingKeys?.has(key));
    });
  }

  private findOneInWorkspace(db: Prisma.TransactionClient, id: string, workspaceId: string) {
    return db.lead.findFirst({
      where: { id, workspaceId },
      include: {
        activities: { orderBy: { createdAt: "desc" } },
        campaign: { select: { id: true, name: true } },
        followUps: { where: { done: false }, orderBy: { scheduledAt: "asc" } },
      },
    });
  }

  private withDedupeKeys<T extends LeadCreateInput>(leads: T[]) {
    return leads.map((lead) => ({
      ...lead,
      cnpj: lead.cnpj ? lead.cnpj.replace(/\D/g, "") : lead.cnpj,
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
      const cnpj = lead.cnpj?.replace(/\D/g, "");
      const dedupeKey = lead.dedupeKey || buildLeadDedupeKey(lead);

      if (cnpj) addUnique({ cnpj: { equals: cnpj } }, `cnpj:${cnpj}`, seen);
      if (dedupeKey) addUnique({ dedupeKey: { equals: dedupeKey } }, `dedupe:${dedupeKey}`, seen);
      if (name) addUnique({ name: { contains: lead.name.trim(), mode: "insensitive" } }, `name:${name}`, seen);
      if (referenceUrl) addUnique({ referenceUrl: { equals: lead.referenceUrl } }, `ref:${referenceUrl}`, seen);
      if (website) addUnique({ website: { equals: lead.website } }, `site:${website}`, seen);
      if (instagramUrl) addUnique({ instagramUrl: { equals: lead.instagramUrl } }, `ig:${instagramUrl}`, seen);
      if (phone) addUnique({ phone: { equals: lead.phone } }, `phone:${phone}`, seen);
      if (name && address) {
        addUnique(
          {
            AND: [
              { name: { equals: lead.name, mode: "insensitive" } },
              { address: { equals: lead.address, mode: "insensitive" } },
            ],
          },
          `name-address:${name}|${address}`,
          seen,
        );
      }
    }

    return conditions.length > 0 ? conditions : [{ id: "__never__" }];
  }

  private getLeadDuplicateKeys(
    lead: Pick<
      LeadCreateInput,
      "name" | "address" | "phone" | "website" | "instagramUrl" | "referenceUrl" | "dedupeKey" | "cnpj"
    >,
  ) {
    return getLeadDuplicateKeys(lead);
  }
}
