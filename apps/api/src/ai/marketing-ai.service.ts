import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";

export interface GenerateContentInput {
  businessName: string;
  address?: string;
  industry: string;
  rating?: string;
  hasWebsite?: boolean;
  yourService: string;
  contentStyle: string;
  language: string;
  score: number;
  catalogOpportunity?: {
    level: "HIGH" | "MEDIUM" | "LOW";
    hasWebsite: boolean;
    reasons: string[];
    offerAngle: string;
  };
  workspaceId?: string;
}

export interface MarketingContent {
  email: { subject: string; body: string };
  whatsapp: string;
  instagram: string;
  linkedin: { connectionNote: string };
  coldCall: { opening: string };
}

@Injectable()
export class MarketingAiService {
  private readonly logger = new Logger(MarketingAiService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async resolveProviderConfig(workspaceId?: string) {
    if (workspaceId) {
      const integration = await this.prisma.withWorkspace(workspaceId, (db) =>
        db.integration.findFirst({
          where: { workspaceId, type: "openai", enabled: true },
        }),
      );
      const savedConfig = integration?.config as Record<string, string> | undefined;
      if (savedConfig?.apiKey?.trim()) {
        return {
          apiKey: savedConfig.apiKey,
          model: savedConfig.model || "gpt-4o-mini",
          baseURL: savedConfig.baseURL || undefined,
        };
      }
    }

    return {
      apiKey: this.config.get<string>("OPENAI_API_KEY") || "",
      model: this.config.get<string>("OPENAI_MODEL") || "gpt-4o-mini",
      baseURL: this.config.get<string>("OPENAI_BASE_URL") || undefined,
    };
  }

  async generateContent(input: GenerateContentInput): Promise<MarketingContent> {
    const providerConfig = await this.resolveProviderConfig(input.workspaceId);
    if (!providerConfig.apiKey) return this.generateMockContent(input);
    try {
      return await this.callOpenAI(input, providerConfig);
    } catch (err) {
      this.logger.error("Falha na geração por IA; usando conteúdo local de fallback", err);
      return this.generateMockContent(input);
    }
  }

  private async callOpenAI(
    input: GenerateContentInput,
    providerConfig: { apiKey: string; model: string; baseURL?: string },
  ): Promise<MarketingContent> {
    const openai = new OpenAI({
      apiKey: providerConfig.apiKey,
      baseURL: providerConfig.baseURL,
    });
    const isEnglish = input.language === "english";
    const styleCues: Record<string, string> = {
      professional: "formal, profissional e direto",
      friendly: "acolhedor, amigável e acessível",
      casual: "leve, simples e conversacional",
      balanced: "equilibrado, amigável e profissional",
    };
    const style = styleCues[input.contentStyle] || styleCues.balanced;

    const prompt = `Gere conteúdo personalizado de abordagem comercial para este lead.

Empresa: ${input.businessName}
Nicho: ${input.industry}
Endereço: ${input.address || "não informado"}
Avaliação: ${input.rating || "não informada"} estrelas
Tem site: ${input.hasWebsite ? "sim" : "não"}
Meu serviço/produto: ${input.yourService}
Tom: ${style}
Idioma obrigatório: ${isEnglish ? "Inglês" : "Português do Brasil"}
Score IA: ${input.score}/100
Oportunidade para catálogo: ${input.catalogOpportunity?.level ?? "não calculada"}
Ângulo comercial: ${input.catalogOpportunity?.offerAngle ?? "catálogo online para melhorar presença digital e conversão"}

Gere: e-mail (assunto + corpo, 100-150 palavras), WhatsApp (50-80 palavras), mensagem para Instagram (40-60 palavras), nota de conexão no LinkedIn (menos de 280 caracteres) e abertura de ligação fria (2-3 frases).

Seja específico para esta empresa. Mencione o nome, avaliação e localização quando fizer sentido. Se a empresa não tiver site, posicione o catálogo online como primeira presença digital prática. Se já tiver site, posicione o catálogo como complemento rápido para WhatsApp e produtos. Não invente dados.

Responda SOMENTE com JSON válido:
{
  "email": { "subject": "...", "body": "..." },
  "whatsapp": "...",
  "instagram": "...",
  "linkedin": { "connectionNote": "..." },
  "coldCall": { "opening": "..." }
}`;

    const response = await openai.chat.completions.create({
      model: providerConfig.model,
      messages: [{ role: "user", content: prompt }],
      temperature: 0.7,
      max_tokens: this.resolveMaxTokens(),
      response_format: { type: "json_object" },
    }, {
      timeout: 10000,
    });
    return JSON.parse(response.choices[0].message.content!) as MarketingContent;
  }

  private resolveMaxTokens() {
    const configured = Number(this.config.get<string>("OPENAI_MAX_TOKENS") || 1000);
    if (!Number.isFinite(configured)) return 1000;
    return Math.min(4000, Math.max(128, Math.round(configured)));
  }

  generateMockContent(input: GenerateContentInput): MarketingContent {
    const isEnglish = input.language === "english";
    const name = input.businessName;
    const service = input.yourService;
    const ratingTagEn = input.rating ? ` with a ${input.rating}-star rating` : "";
    const ratingTagPt = input.rating ? ` com avaliação ${input.rating} estrelas` : "";

    if (isEnglish) {
      return {
        email: {
          subject: `Grow ${name} with ${service}`,
          body: `Hi ${name} team,\n\nI came across your business${ratingTagEn} and noticed a strong opportunity to improve customer acquisition.\n\nI'd love to share how ${service} could help ${name} serve more customers and grow faster.\n\nWould you have 15 minutes for a quick chat?\n\nBest,\n[Your Name]`,
        },
        whatsapp: `Hi ${name}!\n\nI saw your business${input.rating ? ` rated ${input.rating} stars` : ""} and noticed an opportunity for ${service} to help you capture more customers.\n\nWould a quick chat make sense?`,
        instagram: `Hi ${name}! I liked what you're building${input.rating ? ` with a ${input.rating}-star rating` : ""}. I believe ${service} could help your business attract more customers. Can I send you an idea?`,
        linkedin: { connectionNote: `Hi, I noticed ${name} and would like to connect. I work with ${service} and see a good opportunity for collaboration.` },
        coldCall: { opening: `Hi, may I speak with the owner of ${name}? I work with ${service} and would like to share a practical idea to help ${name} attract more customers.` },
      };
    }

    return {
      email: {
        subject: `Como ${name} pode vender mais com ${service}`,
        body: `Olá, equipe ${name}.\n\nEncontrei a empresa de vocês${ratingTagPt} e percebi uma oportunidade clara de melhorar a captação de clientes.\n\nEu trabalho com ${service} e acredito que isso pode ajudar o ${name} a apresentar melhor seus produtos ou serviços, facilitar o atendimento e gerar mais contatos qualificados.\n\nPodemos conversar por 15 minutos para eu te mostrar uma ideia prática?\n\nAbraço,\n[Seu nome]`,
      },
      whatsapp: `Olá, ${name}!\n\nVi a empresa de vocês${input.rating ? ` com avaliação ${input.rating} estrelas` : ""} e percebi uma oportunidade para melhorar a presença digital com ${service}.\n\nPosso te mostrar uma ideia rápida de como isso pode gerar mais contatos?`,
      instagram: `Olá, ${name}! Vi o trabalho de vocês${input.rating ? ` e a avaliação ${input.rating} estrelas` : ""}. Acredito que ${service} pode ajudar a transformar visitas em mais clientes. Posso enviar uma ideia?`,
      linkedin: { connectionNote: `Olá, vi o ${name} e gostaria de conectar. Trabalho com ${service} e vejo uma boa oportunidade de colaboração.` },
      coldCall: { opening: `Olá, tudo bem? Eu poderia falar com o responsável pelo ${name}? Trabalho com ${service} e gostaria de compartilhar uma ideia prática para ajudar vocês a gerar mais clientes.` },
    };
  }
}
