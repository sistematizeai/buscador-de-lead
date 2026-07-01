import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../prisma/prisma.service";
import { LeadsService } from "../leads/leads.service";
import { RateLimitService } from "../security/rate-limit.service";
import { SecurityAuditService } from "../security/security-audit.service";
import { CompanySearchDto } from "./dto/company-search.dto";
import { SaveCompanyToCrmDto } from "./dto/save-company-to-crm.dto";
import { isValidCnpj, normalizeCnpj } from "./cnpj";
import { buildLeadDedupeKey } from "../leads/lead-dedupe";

export interface CompanySearchResult {
  id: string;
  companyName: string;
  tradeName?: string | null;
  cnpj?: string | null;
  businessStatus?: string | null;
  openedAt?: string | null;
  legalNature?: string | null;
  cnae?: string | null;
  cnaeDescription?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  source: string;
  sourceReference?: string | null;
  searchedAt: string;
}

interface SearchMeta {
  userId: string;
  workspaceId: string;
  ipAddress?: string;
  userAgent?: string;
}

@Injectable()
export class CompanySearchService {
  private readonly logger = new Logger(CompanySearchService.name);

  constructor(
    private prisma: PrismaService,
    private leads: LeadsService,
    private config: ConfigService,
    private rateLimit: RateLimitService,
    private audit: SecurityAuditService,
  ) {}

  async search(dto: CompanySearchDto, meta: SearchMeta) {
    this.assertUsefulQuery(dto);
    const isCnpjSearch = Boolean(dto.cnpj?.trim());
    const action = isCnpjSearch ? "company_search.cnpj" : "company_search.name_address";
    const userLimit = isCnpjSearch ? 30 : 20;
    const workspaceLimit = isCnpjSearch ? 100 : 80;
    await this.rateLimit.assertAllowed({
      key: `${action}:user:${meta.userId}`,
      action,
      scope: "user",
      limit: userLimit,
      windowMs: 60 * 60 * 1000,
      userId: meta.userId,
      workspaceId: meta.workspaceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      endpoint: "POST /company-search",
    });
    await this.rateLimit.assertAllowed({
      key: `${action}:workspace:${meta.workspaceId}`,
      action,
      scope: "workspace",
      limit: workspaceLimit,
      windowMs: 60 * 60 * 1000,
      userId: meta.userId,
      workspaceId: meta.workspaceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      endpoint: "POST /company-search",
    });

    const results: CompanySearchResult[] = [];
    const providers: string[] = [];

    if (dto.cnpj) {
      const cnpj = normalizeCnpj(dto.cnpj);
      if (!isValidCnpj(cnpj)) throw new BadRequestException("CNPJ inválido");
      const byCnpj = await this.searchByCnpj(cnpj);
      if (byCnpj) {
        results.push(byCnpj);
        providers.push(byCnpj.source);
      }
    }

    const internalResults = await this.searchInternalTenantData(dto, meta.workspaceId);
    for (const result of internalResults) {
      if (!results.some((item) => this.sameCompany(item, result))) {
        results.push(result);
      }
    }
    if (internalResults.length) providers.push("tenant_database");

    const status = results.length ? "found" : "not_found";
    const log = await this.prisma.companySearchLog.create({
      data: {
        workspaceId: meta.workspaceId,
        userId: meta.userId,
        query: this.sanitizeQuery(dto),
        provider: providers.length ? providers.join(",") : "none",
        status,
        resultId: results[0]?.id,
      },
    });

    await this.audit.record({
      event: "company_search",
      outcome: "success",
      workspaceId: meta.workspaceId,
      userId: meta.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { status, providers, resultCount: results.length },
    });

    return {
      mode: "Pesquisa Individual",
      savedAutomatically: false,
      searchId: log.id,
      results,
      message: results.length
        ? "Empresa localizada. Revise os dados antes de adicionar ao CRM."
        : "Nenhuma empresa encontrada nas fontes configuradas para busca individual.",
    };
  }

  async history(workspaceId: string) {
    return this.prisma.companySearchLog.findMany({
      where: { workspaceId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  }

  async saveToCrm(dto: SaveCompanyToCrmDto, meta: SearchMeta) {
    await this.rateLimit.assertAllowed({
      key: `company_search.save_to_crm:user:${meta.userId}`,
      action: "company_search.save_to_crm",
      scope: "user",
      limit: 60,
      windowMs: 60 * 60 * 1000,
      userId: meta.userId,
      workspaceId: meta.workspaceId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      endpoint: "POST /company-search/save-to-crm",
    });
    const cnpj = dto.cnpj ? normalizeCnpj(dto.cnpj) : null;
    if (cnpj && !isValidCnpj(cnpj)) throw new BadRequestException("CNPJ inválido");

    const existing = await this.findExistingCrmLead(meta.workspaceId, cnpj, dto);
    if (existing) {
      return {
        created: false,
        duplicate: true,
        lead: existing,
        message: "Empresa já existe no CRM deste workspace.",
      };
    }

    const created = await this.prisma.lead.create({
      data: {
        workspaceId: meta.workspaceId,
        name: dto.companyName,
        tradeName: dto.tradeName,
        cnpj,
        businessStatus: dto.businessStatus,
        industry: dto.industry,
        cnae: dto.cnae,
        address: dto.address,
        zipCode: dto.zipCode,
        phone: dto.phone,
        email: dto.email,
        website: dto.website,
        hasWebsite: Boolean(dto.website),
        source: "company_search",
        searchOrigin: "Busca de Empresa",
        searchProvider: dto.searchProvider || "manual",
        referenceUrl: dto.sourceReference,
        crmStatus: "potential_customer",
        crmNotes: dto.notes,
        tags: dto.tags ?? [],
        dedupeKey: buildLeadDedupeKey({
          name: dto.companyName,
          address: dto.address,
          phone: dto.phone,
          website: dto.website,
          cnpj,
        }),
        priority: "MEDIUM",
        score: 50,
      },
    });

    await this.prisma.leadActivity.create({
      data: {
        leadId: created.id,
        type: "crm_create",
        note: "Empresa adicionada manualmente ao CRM a partir da busca individual.",
        metadata: {
          source: "Busca de Empresa",
          userId: meta.userId,
          status: "potential_customer",
        },
      },
    });

    await this.audit.record({
      event: "company_search_saved_to_crm",
      outcome: "success",
      workspaceId: meta.workspaceId,
      userId: meta.userId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
      metadata: { leadId: created.id, hasCnpj: Boolean(cnpj) },
    });

    return {
      created: true,
      duplicate: false,
      lead: created,
      message: "Empresa adicionada ao CRM como Potencial Cliente.",
    };
  }

  private async searchByCnpj(cnpj: string) {
    const baseUrl = this.config.get<string>("COMPANY_CNPJ_PROVIDER_URL") || "https://brasilapi.com.br/api/cnpj/v1";
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), Number(this.config.get<string>("COMPANY_SEARCH_TIMEOUT_MS") || 8000));

    try {
      const response = await fetch(`${baseUrl.replace(/\/$/, "")}/${cnpj}`, {
        signal: controller.signal,
        headers: { Accept: "application/json" },
      });

      if (response.status === 404) return null;
      if (!response.ok) throw new Error(`Provider returned HTTP ${response.status}`);

      const data = await response.json() as Record<string, any>;
      return this.normalizeBrasilApi(data);
    } catch (error) {
      this.logger.warn(`Falha na consulta CNPJ ${cnpj}: ${error}`);
      throw new BadRequestException("Não foi possível consultar o provedor de CNPJ agora");
    } finally {
      clearTimeout(timeout);
    }
  }

  private normalizeBrasilApi(data: Record<string, any>): CompanySearchResult {
    const address = [
      data.descricao_tipo_de_logradouro,
      data.logradouro,
      data.numero,
      data.complemento,
      data.bairro,
      data.municipio,
      data.uf,
      data.cep,
    ].filter(Boolean).join(", ");

    return {
      id: `cnpj:${normalizeCnpj(data.cnpj)}`,
      companyName: data.razao_social || data.nome_fantasia || "Empresa sem nome",
      tradeName: data.nome_fantasia || null,
      cnpj: normalizeCnpj(data.cnpj),
      businessStatus: data.descricao_situacao_cadastral || null,
      openedAt: data.data_inicio_atividade || null,
      legalNature: data.natureza_juridica || null,
      cnae: data.cnae_fiscal ? String(data.cnae_fiscal) : null,
      cnaeDescription: data.cnae_fiscal_descricao || null,
      industry: data.cnae_fiscal_descricao || null,
      size: data.porte || null,
      address,
      zipCode: data.cep || null,
      city: data.municipio || null,
      state: data.uf || null,
      district: data.bairro || null,
      phone: [data.ddd_telefone_1, data.ddd_telefone_2].filter(Boolean)[0] || null,
      email: data.email || null,
      website: null,
      source: "brasilapi_cnpj",
      sourceReference: "https://brasilapi.com.br/",
      searchedAt: new Date().toISOString(),
    };
  }

  private async searchInternalTenantData(dto: CompanySearchDto, workspaceId: string): Promise<CompanySearchResult[]> {
    const cnpj = dto.cnpj ? normalizeCnpj(dto.cnpj) : undefined;
    const name = dto.companyName || dto.tradeName || dto.legalName;
    const locationTerms = [dto.city, dto.state, dto.district, dto.street].filter(Boolean).join(" ");
    const filters = [
      ...(cnpj ? [{ cnpj }] : []),
      ...(name ? [{ name: { contains: name, mode: "insensitive" as const } }] : []),
      ...(name ? [{ tradeName: { contains: name, mode: "insensitive" as const } }] : []),
      ...(locationTerms ? [{ address: { contains: locationTerms, mode: "insensitive" as const } }] : []),
    ];

    if (!filters.length) return [];

    const leads = await this.prisma.lead.findMany({
      where: {
        workspaceId,
        OR: filters,
      },
      take: 5,
      orderBy: { updatedAt: "desc" },
    });

    return leads.map((lead) => ({
      id: `lead:${lead.id}`,
      companyName: lead.name,
      tradeName: lead.tradeName,
      cnpj: lead.cnpj,
      businessStatus: lead.businessStatus,
      cnae: lead.cnae,
      industry: lead.industry || lead.category,
      address: lead.address,
      zipCode: lead.zipCode,
      phone: lead.phone,
      email: lead.email,
      website: lead.website,
      source: "tenant_database",
      sourceReference: lead.referenceUrl,
      searchedAt: new Date().toISOString(),
    }));
  }

  private async findExistingCrmLead(workspaceId: string, cnpj: string | null, dto: SaveCompanyToCrmDto) {
    return this.prisma.lead.findFirst({
      where: {
        workspaceId,
        OR: [
          ...(cnpj ? [{ cnpj }] : []),
          {
            AND: [
              { name: { equals: dto.companyName, mode: "insensitive" } },
              ...(dto.address ? [{ address: { equals: dto.address, mode: "insensitive" as const } }] : []),
            ],
          },
        ],
      },
    });
  }

  private assertUsefulQuery(dto: CompanySearchDto) {
    const hasAny = [
      dto.cnpj,
      dto.companyName,
      dto.legalName,
      dto.tradeName,
      dto.city,
      dto.state,
      dto.zipCode,
      dto.district,
      dto.street,
      dto.segment,
      dto.cnae,
    ].some((value) => Boolean(value?.trim()));

    if (!hasAny) throw new BadRequestException("Informe ao menos um dado para localizar a empresa");
  }

  private sanitizeQuery(dto: CompanySearchDto) {
    const query = {
      ...dto,
      cnpj: dto.cnpj ? normalizeCnpj(dto.cnpj) : undefined,
    };
    return Object.fromEntries(Object.entries(query).filter(([, value]) => value !== undefined && value !== ""));
  }

  private sameCompany(left: CompanySearchResult, right: CompanySearchResult) {
    return Boolean(
      (left.cnpj && right.cnpj && left.cnpj === right.cnpj) ||
      (left.companyName.toLowerCase() === right.companyName.toLowerCase() && left.address === right.address),
    );
  }
}
