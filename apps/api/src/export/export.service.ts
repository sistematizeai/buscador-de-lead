import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

const DEFAULT_WORKSPACE_ID = "default-workspace";
const PRIORITY_LABELS: Record<string, string> = { HIGH: "Alta", MEDIUM: "Média", LOW: "Baixa" };
const CRM_LABELS: Record<string, string> = {
  new: "Novo",
  contacted: "Contatado",
  replied: "Respondeu",
  meeting: "Reunião",
  proposal: "Proposta",
  won: "Ganho",
  lost: "Perdido",
  contact_later: "Contatar futuramente",
};

@Injectable()
export class ExportService {
  constructor(private prisma: PrismaService) {}

  async getLeads(workspaceId = DEFAULT_WORKSPACE_ID, campaignId?: string) {
    return this.prisma.lead.findMany({
      where: { workspaceId, ...(campaignId && { campaignId }) },
      orderBy: [{ priority: "asc" }, { score: "desc" }],
      include: { campaign: { select: { name: true } } },
    });
  }

  toCsv(leads: Awaited<ReturnType<typeof this.getLeads>>): string {
    const headers = [
      "Nome", "Endereço", "Telefone", "Website", "Avaliação", "Score", "Prioridade",
      "Status CRM", "Campanha", "Tem site", "Coletado em",
    ];
    const escape = (v: unknown) => {
      const s = v == null ? "" : String(v);
      return s.includes(",") || s.includes('"') || s.includes("\n")
        ? `"${s.replace(/"/g, '""')}"` : s;
    };
    const rows = leads.map((l) => [
      l.name, l.address, l.phone, l.website, l.rating, l.score, PRIORITY_LABELS[l.priority] ?? l.priority,
      CRM_LABELS[l.crmStatus] ?? l.crmStatus, l.campaign?.name ?? "", l.hasWebsite ? "Sim" : "Não",
      new Date(l.scrapedAt).toISOString(),
    ].map(escape).join(","));
    return [headers.join(","), ...rows].join("\n");
  }

  toJson(leads: Awaited<ReturnType<typeof this.getLeads>>) {
    return leads.map((l) => ({
      id: l.id,
      name: l.name,
      address: l.address,
      phone: l.phone,
      website: l.website,
      rating: l.rating,
      score: l.score,
      priority: PRIORITY_LABELS[l.priority] ?? l.priority,
      crmStatus: CRM_LABELS[l.crmStatus] ?? l.crmStatus,
      crmNotes: l.crmNotes,
      hasWebsite: l.hasWebsite,
      campaign: l.campaign?.name,
      marketingContent: l.marketingContent,
      scrapedAt: l.scrapedAt,
    }));
  }

  toVCard(leads: Awaited<ReturnType<typeof this.getLeads>>): string {
    return leads
      .filter((l) => l.phone || l.email)
      .map((l) => {
        const lines = [
          "BEGIN:VCARD",
          "VERSION:3.0",
          `FN:${l.name}`,
          l.phone ? `TEL;TYPE=WORK:${l.phone}` : null,
          l.email ? `EMAIL;TYPE=WORK:${l.email}` : null,
          l.address ? `ADR;TYPE=WORK:;;${l.address};;;;` : null,
          l.website ? `URL:${l.website.startsWith("http") ? l.website : `https://${l.website}`}` : null,
          `NOTE:Score: ${l.score} | Prioridade: ${PRIORITY_LABELS[l.priority] ?? l.priority} | CRM: ${CRM_LABELS[l.crmStatus] ?? l.crmStatus}`,
          "END:VCARD",
        ];
        return lines.filter(Boolean).join("\r\n");
      })
      .join("\r\n");
  }
}
