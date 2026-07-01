import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import OpenAI from "openai";
import { PrismaService } from "../prisma/prisma.service";

export interface ExtractedLeadData {
  phone: string | null;
  email: string | null;
  website: string | null;
  isQualified: boolean;
  businessName: string | null;
  category: string | null;
}

@Injectable()
export class LeadExtractorService {
  private readonly logger = new Logger(LeadExtractorService.name);

  constructor(
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  private async resolveProviderConfig(workspaceId?: string) {
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

  async extractContacts(rawText: string, workspaceId?: string): Promise<ExtractedLeadData> {
    const providerConfig = await this.resolveProviderConfig(workspaceId);

    if (!providerConfig.apiKey || !rawText.trim()) {
      return this.fallbackRegexExtraction(rawText);
    }

    try {
      const openai = new OpenAI({
        apiKey: providerConfig.apiKey,
        baseURL: providerConfig.baseURL,
      });

      const prompt = `Analise o seguinte texto bruto extraído de um perfil de rede social ou anúncio comercial e extraia as informações estruturadas de contato.
Importante: O usuário pode tentar camuflar e-mails ou números escrevendo-os por extenso ou com espaços adicionais. Tente limpá-los e retornar apenas os números limpos do telefone (com DDD se disponível).
Classifique também se o texto parece ser de uma empresa ou profissional ativo apto a comprar serviços B2B (isQualified: true) ou se é um perfil pessoal/inativo/spam (isQualified: false).

Texto: "${rawText}"

Responda OBRIGATORIAMENTE apenas com um objeto JSON válido, sem trechos markdown:
{
  "phone": "apenas números ou null se não houver",
  "email": "e-mail limpo ou null se não houver",
  "website": "url limpa ou null se não houver",
  "isQualified": true ou false,
  "businessName": "nome do negócio se identificado ou null",
  "category": "categoria de atuação se identificada ou null"
}`;

      const response = await openai.chat.completions.create({
        model: providerConfig.model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2, // Baixa temperatura para maior precisão de dados
        max_tokens: 500,
        response_format: { type: "json_object" },
      }, {
        timeout: 10000,
      });

      const content = response.choices[0].message.content!;
      const parsed = JSON.parse(content) as ExtractedLeadData;
      
      // Limpa caracteres não numéricos do telefone retornado pela IA para garantir higienização
      if (parsed.phone) {
        parsed.phone = parsed.phone.replace(/\D/g, "");
      }

      return parsed;
    } catch (err) {
      this.logger.error("Falha na extração de contatos por IA; usando fallback por regex", err);
      return this.fallbackRegexExtraction(rawText);
    }
  }

  private fallbackRegexExtraction(text: string): ExtractedLeadData {
    if (!text || !text.trim()) {
      return {
        phone: null,
        email: null,
        website: null,
        isQualified: false,
        businessName: null,
        category: null,
      };
    }

    // RegEx simples para e-mail
    const emailMatch = text.match(/[\w.-]+@[\w.-]+\.[\w.-]+/);
    const email = emailMatch ? emailMatch[0] : null;

    // RegEx para telefones brasileiros comuns (simplificado)
    const cleanedTextForPhone = text.replace(/[-\s()._]/g, "");
    const phoneMatch = cleanedTextForPhone.match(/(?:(?:\+|00)?(55))?([1-9]{2})[9]?[2-9]\d{7}/);
    let phone = null;
    if (phoneMatch) {
      phone = phoneMatch[0];
      // Se não tiver o prefixo 55 no início, adiciona
      if (!phone.startsWith("55") && phone.length <= 11) {
        phone = "55" + phone;
      }
    }

    // RegEx para sites
    const webMatch = text.match(/(?:https?:\/\/)?(?:www\.)?[\w-]+\.[\w.-]+/);
    let website = null;
    if (webMatch && !webMatch[0].includes("instagram.com") && !webMatch[0].includes("facebook.com")) {
      website = webMatch[0];
    }

    return {
      phone,
      email,
      website,
      isQualified: phone !== null || email !== null, // qualificado se houver ao menos um contato detectado por regex
      businessName: null,
      category: null,
    };
  }
}
