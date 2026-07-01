import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_WORKSPACE_ID = "default-workspace";
const PRIORITY_LABELS: Record<string, string> = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
const CRM_LABELS: Record<string, string> = {
  new: "Novo",
  potential_customer: "Potencial Cliente",
  contacted: "Contatado",
  qualified: "Qualificado",
  proposal: "Proposta Enviada",
  negotiation: "Negociação",
  won: "Ganho",
  not_interested: "Sem Interesse",
  lost: "Perdido",
  archived: "Arquivado",
};

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async getLeads(workspaceId = DEFAULT_WORKSPACE_ID, campaignId?: string) {
    return this.prisma.withWorkspace(workspaceId, (db) =>
      db.lead.findMany({
        where: { workspaceId, ...(campaignId && { campaignId }) },
        orderBy: [{ priority: "asc" }, { score: "desc" }],
        include: { campaign: { select: { name: true } } },
      }),
    );
  }

  toCsv(leads: Awaited<ReturnType<typeof this.getLeads>>): string {
    const headers = [
      "Nome",
      "Nome fantasia",
      "CNPJ",
      "Endereço",
      "Telefone",
      "Website",
      "Instagram",
      "Avaliação",
      "Score",
      "Prioridade",
      "Status CRM",
      "Campanha",
      "Tem site",
      "Origem",
      "Coletado em",
    ];
    const escape = (value: unknown) => {
      const text = value == null ? "" : String(value);
      return text.includes(",") || text.includes('"') || text.includes("\n")
        ? `"${text.replace(/"/g, '""')}"`
        : text;
    };
    const rows = leads.map((lead) =>
      [
        lead.name,
        lead.tradeName,
        lead.cnpj,
        lead.address,
        lead.phone,
        lead.website,
        lead.instagramUrl,
        lead.rating,
        lead.score,
        PRIORITY_LABELS[lead.priority] ?? lead.priority,
        CRM_LABELS[lead.crmStatus] ?? lead.crmStatus,
        lead.campaign?.name ?? "",
        lead.hasWebsite ? "Sim" : "Não",
        lead.searchOrigin ?? lead.source,
        new Date(lead.scrapedAt).toISOString(),
      ]
        .map(escape)
        .join(","),
    );
    return [headers.join(","), ...rows].join("\n");
  }

  toJson(leads: Awaited<ReturnType<typeof this.getLeads>>) {
    return leads.map((lead) => ({
      id: lead.id,
      name: lead.name,
      tradeName: lead.tradeName,
      cnpj: lead.cnpj,
      address: lead.address,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      instagramUrl: lead.instagramUrl,
      rating: lead.rating,
      score: lead.score,
      priority: PRIORITY_LABELS[lead.priority] ?? lead.priority,
      crmStatus: CRM_LABELS[lead.crmStatus] ?? lead.crmStatus,
      crmNotes: lead.crmNotes,
      hasWebsite: lead.hasWebsite,
      campaign: lead.campaign?.name,
      marketingContent: lead.marketingContent,
      searchOrigin: lead.searchOrigin,
      searchProvider: lead.searchProvider,
      scrapedAt: lead.scrapedAt,
    }));
  }

  toVCard(leads: Awaited<ReturnType<typeof this.getLeads>>): string {
    return leads
      .filter((lead) => lead.phone || lead.email)
      .map((lead) => {
        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${lead.tradeName || lead.name}`,
          lead.phone ? `TEL;TYPE=WORK:${lead.phone}` : null,
          lead.email ? `EMAIL;TYPE=WORK:${lead.email}` : null,
          lead.address ? `ADR;TYPE=WORK:;;${lead.address};;;;` : null,
          lead.website ? `URL:${lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}` : null,
          lead.instagramUrl ? `X-SOCIALPROFILE;TYPE=instagram:${lead.instagramUrl}` : null,
          `NOTE:CNPJ: ${lead.cnpj ?? ""} | Score: ${lead.score} | Prioridade: ${PRIORITY_LABELS[lead.priority] ?? lead.priority} | CRM: ${CRM_LABELS[lead.crmStatus] ?? lead.crmStatus}${lead.instagramUrl ? ` | Instagram: ${lead.instagramUrl}` : ""}`,
          "END:VCARD",
        ];
        return lines.filter(Boolean).join("\r\n");
      })
      .join("\r\n");
  }
}
