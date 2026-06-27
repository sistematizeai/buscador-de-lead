import { Injectable } from "@nestjs/common";

interface LeadData {
  name: string;
  address?: string;
  phone?: string;
  website?: string;
  rating?: string;
  hasWebsite?: boolean;
  industry?: string;
  category?: string;
  referenceLink?: string;
}

export interface LeadIntelligence {
  score: number;
  priority: "HIGH" | "MEDIUM" | "LOW";
  category: string;
  factors: string[];
  recommendation: string;
  catalogOpportunity: {
    level: "HIGH" | "MEDIUM" | "LOW";
    hasWebsite: boolean;
    reasons: string[];
    offerAngle: string;
  };
}

@Injectable()
export class LeadIntelligenceService {
  private readonly INDUSTRY_SCORES: Record<string, number> = {
    restaurant: 85, cafe: 90, retail: 75, automotive: 80, healthcare: 85,
    beauty: 80, education: 75, realestate: 85, event: 80, tech: 90,
    professional: 85, hotel: 80, spa: 78, gym: 75,
    restaurante: 85, cafeteria: 90, varejo: 75, automotivo: 80, saude: 85,
    beleza: 80, educacao: 75, imobiliaria: 85, eventos: 80, tecnologia: 90,
    profissional: 85, academia: 75, clinica: 85, padaria: 82,
  };

  private readonly CITY_SCORES: Record<string, number> = {
    jakarta: 95, surabaya: 85, bandung: 80, medan: 75, yogyakarta: 78,
    semarang: 72, makassar: 70, palembang: 68, pekanbaru: 65, denpasar: 85,
    saopaulo: 95, riodejaneiro: 90, belohorizonte: 84, curitiba: 82,
    portoalegre: 80, brasilia: 82, salvador: 78, recife: 76,
    fortaleza: 76, campinas: 80,
  };

  scoreLead(lead: LeadData, targetIndustry?: string): LeadIntelligence {
    let score = 50;
    const factors: string[] = [];

    const hasWebsite = Boolean(lead.website || lead.hasWebsite);
    const catalogReasons: string[] = [];

    if (lead.phone) {
      score += 10;
      factors.push("Tem telefone");
      catalogReasons.push("Possui telefone para abordagem direta");
    }
    if (hasWebsite) {
      score += 2;
      factors.push("Tem site");
      catalogReasons.push("Já possui site; oportunidade menor para catálogo inicial");
    } else {
      score += 22;
      factors.push("Sem site (oportunidade alta para catálogo online)");
      catalogReasons.push("Não possui site publicado");
    }
    if (lead.address) { score += 5; factors.push("Tem endereço"); }

    const rating = parseFloat(lead.rating ?? "0");
    if (rating >= 4.5) { score += 15; factors.push(`Avaliação alta: ${rating} estrelas`); }
    else if (rating >= 4.0) { score += 10; factors.push(`Boa avaliação: ${rating} estrelas`); }
    else if (rating >= 3.5) { score += 5; factors.push(`Avaliação média: ${rating} estrelas`); }

    const industryKey = this.normalizeKey(targetIndustry || lead.industry || "");
    const industryScore = this.INDUSTRY_SCORES[industryKey];
    if (industryScore) {
      const bonus = (industryScore - 50) / 5;
      score += bonus;
      factors.push(`Nicho de alto valor: ${targetIndustry || lead.industry}`);
    }

    const addressLower = this.normalizeKey(lead.address || "");
    for (const [city, cityScore] of Object.entries(this.CITY_SCORES)) {
      if (addressLower.includes(city)) {
        score += (cityScore - 50) / 10;
        factors.push(`Região estratégica: ${city}`);
        break;
      }
    }

    score = Math.min(100, Math.max(0, Math.round(score)));
    const priority: "HIGH" | "MEDIUM" | "LOW" = score >= 75 ? "HIGH" : score >= 55 ? "MEDIUM" : "LOW";
    const category = targetIndustry || lead.industry || "Negócio local";
    const catalogOpportunity = this.buildCatalogOpportunity(hasWebsite, score, catalogReasons);

    let recommendation = "";
    if (priority === "HIGH") recommendation = `${category} com alto potencial. Priorize a abordagem imediatamente, destacando catálogo online, cardápio/produtos e facilidade de atendimento.`;
    else if (priority === "MEDIUM") recommendation = `Potencial moderado. Inclua na sequência padrão de abordagem.`;
    else recommendation = `Prioridade menor. Contate somente se houver capacidade.`;

    return { score, priority, category, factors, recommendation, catalogOpportunity };
  }

  scoreLeads(leads: LeadData[], targetIndustry?: string): Array<LeadData & LeadIntelligence> {
    return leads
      .map((lead) => ({ ...lead, ...this.scoreLead(lead, targetIndustry) }))
      .sort((a, b) => b.score - a.score);
  }

  private normalizeKey(value: string) {
    return value
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z]/g, "");
  }

  private buildCatalogOpportunity(hasWebsite: boolean, score: number, reasons: string[]) {
    if (!hasWebsite && score >= 75) {
      return {
        level: "HIGH" as const,
        hasWebsite,
        reasons,
        offerAngle: "Oferecer catálogo online como primeira presença digital, com produtos, WhatsApp e link compartilhável.",
      };
    }

    if (!hasWebsite) {
      return {
        level: "MEDIUM" as const,
        hasWebsite,
        reasons,
        offerAngle: "Oferecer catálogo simples para validar presença digital com baixo custo.",
      };
    }

    return {
      level: "LOW" as const,
      hasWebsite,
      reasons,
      offerAngle: "Oferecer catálogo complementar ao site, focado em WhatsApp, produtos e conversão rápida.",
    };
  }
}
