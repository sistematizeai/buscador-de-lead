# Auditoria de Segurança e Produção

## Arquitetura mapeada

- Frontend: Next.js App Router em `apps/web`, React client components e chamadas REST via `src/lib/api.ts`.
- Backend: NestJS em `apps/api`, REST com prefixo `/api`.
- Banco: PostgreSQL via Prisma em `packages/database/prisma/schema.prisma`.
- ORM: Prisma Client.
- Autenticação: JWT Bearer com senha bcrypt. O token agora carrega `workspaceId` e `sessionVersion`.
- Tenant: `Workspace` é o tenant lógico. Recursos principais usam `workspaceId`: campanhas, leads, contatos, integrações, chaves de API, logs de auditoria e histórico de busca.
- Integrações externas: OpenAI/OpenRouter compatível, Gosom Google Maps Scraper, enriquecimento Instagram por busca controlada, BrasilAPI para consulta individual de CNPJ.
- Deploy: Vercel para frontend, Render Docker para backend, Supabase/PostgreSQL para dados.

## Threat model resumido

| Ativo | Risco | Mitigação aplicada |
| --- | --- | --- |
| Dados entre tenants | IDOR/BOLA por `id` sem `workspaceId` | Guards + services filtrando por workspace; correções em campanhas e API keys |
| Sessões JWT | Token antigo continuar válido após reset | `User.sessionVersion` no JWT e validação no `JwtGuard` |
| Senhas | Reset inseguro ou enumeração de e-mail | Token aleatório, hash no banco, expiração, uso único e resposta genérica |
| API keys e integrações | Segredos retornarem ao frontend | Sanitização de configs e listagem de API keys sem valor secreto |
| Exportação CRM | Exfiltração indevida por usuário comum | Permissão backend `crm.export` |
| Busca de empresa | Salvar dados sem ação explícita | Endpoint de busca não cria lead; save exige ação separada |
| Brute force | Tentativas repetidas de login/reset | Rate limit em memória por IP/e-mail/usuário |
| Swagger em produção | Exposição de superfície interna | Swagger desativado em produção salvo `ENABLE_SWAGGER=true` |

## Correções críticas aplicadas

- `CampaignsController.update` agora repassa `workspaceId` ao service antes de atualizar.
- `SettingsService.deleteApiKey` agora valida `id + workspaceId` antes de excluir.
- `JwtGuard` valida membership real do usuário no workspace e `sessionVersion`.
- `WorkspaceId` não retorna mais workspace padrão silencioso quando o token não possui contexto.
- `ValidationPipe` agora rejeita campos extras (`forbidNonWhitelisted`) e remove mensagens detalhadas em produção.
- Headers básicos de segurança adicionados em todas as respostas HTTP.
- `PermissionsGuard` e `RequirePermissions` adicionados para CRM, exportação, API keys e busca individual.

## Redefinição de senha

Fluxo implementado:

- `POST /api/auth/password-reset/request`: recebe e-mail, aplica rate limit, retorna mensagem neutra.
- Token gerado com `randomBytes(32)`.
- Apenas SHA-256 do token é persistido em `password_reset_tokens`.
- Expiração: 30 minutos.
- Uso único: tokens anteriores são invalidados e o token usado recebe `usedAt`.
- `POST /api/auth/password-reset/confirm`: valida força mínima da senha, troca bcrypt hash, incrementa `sessionVersion` e remove sessões antigas.
- Logs de auditoria são gravados sem senha e sem token completo.

Dependência pendente para produção completa: configurar um provedor real de e-mail. Sem isso, o backend gera o token, mas não entrega o link ao usuário final. `PASSWORD_RESET_DEV_RESPONSE` deve ficar `false` em produção.

## Localizar Empresa

Módulo novo:

- Frontend: `/company-search`.
- Backend: `POST /api/company-search`, `GET /api/company-search/history`, `POST /api/company-search/save-to-crm`.
- Campos suportados: CNPJ, nome, razão social, nome fantasia, cidade, UF, CEP, bairro, rua, segmento e CNAE.
- CNPJ é normalizado e validado antes de consulta externa.
- Consulta por CNPJ usa `COMPANY_CNPJ_PROVIDER_URL`, padrão BrasilAPI.
- Busca interna consulta apenas dados do workspace atual.
- A busca não cria campanha e não salva lead automaticamente.
- Rate limit por usuário e workspace.
- Histórico de busca gravado em `company_search_logs`.

## CRM e Potencial Cliente

- Novo status oficial: `potential_customer` com rótulo `Potencial Cliente`.
- Funil atualizado: Novo, Potencial Cliente, Em Contato, Qualificado, Proposta Enviada, Negociação, Cliente, Sem Interesse, Perdido, Arquivado.
- Leads vindos de busca individual são salvos explicitamente com `source=company_search`, `searchOrigin=Busca de Empresa` e `crmStatus=potential_customer`.
- Deduplicação usa CNPJ quando disponível e mantém critérios anteriores por site, telefone, Instagram, referência e nome/endereço.
- `campaignId` em `Lead` agora é opcional para permitir CRM manual sem campanha automática.

## Testes adicionados/reforçados

- Validação de CNPJ válido, inválido e normalização.
- Busca individual não salva lead automaticamente.
- Salvamento no CRM detecta duplicidade por CNPJ no workspace.
- Criação manual entra como `Potencial Cliente`.
- Exclusão de API key exige workspace atual.
- Update de campanha usa workspace atual.

## Configurações manuais necessárias

- Render backend:
  - `DATABASE_URL`
  - `DIRECT_URL`
  - `JWT_SECRET`
  - `NEXT_PUBLIC_APP_URL`
  - `CORS_ALLOWED_ORIGINS`
  - `OPENAI_API_KEY`
  - `OPENAI_BASE_URL`
  - `OPENAI_MODEL`
  - `COMPANY_CNPJ_PROVIDER_URL`
  - `COMPANY_SEARCH_TIMEOUT_MS`
  - `SCRAPER_*`
  - `INSTAGRAM_LOOKUP_*`
- Vercel frontend:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_APP_URL`
- E-mail transacional: pendente para envio real de reset de senha.
- RLS no banco: pendente. A aplicação já aplica isolamento por `workspaceId`, mas RLS no Supabase exige desenho de roles/session variables separado para não conflitar com Prisma.
- WAF/alertas/backups: dependem de configuração cloud fora do código.

## Checklist pré-produção

| Item | Status |
| --- | --- |
| Build API | Concluído |
| Build frontend | Concluído |
| Testes unitários | Concluído |
| Segredos fora do frontend | Concluído |
| Swagger fechado por padrão em produção | Concluído |
| Reset de senha backend | Concluído |
| Tela de reset | Concluído |
| Busca individual | Concluído |
| Salvar no CRM manualmente | Concluído |
| Status Potencial Cliente | Concluído |
| Aplicar schema no banco remoto | Pendente até `prisma db push` |
| Provedor real de e-mail | Pendente |
| RLS Supabase | Pendente |
| WAF/monitoramento externo | Pendente |

## Riscos residuais

- Rate limit em memória é suficiente para uma instância Render Free, mas deve migrar para Redis/Upstash se houver múltiplas instâncias.
- Reset de senha precisa de provedor de e-mail para uso final em produção.
- RLS não foi ativado no banco porque a aplicação usa Prisma com credenciais de app; ativar RLS sem session variables quebraria queries existentes.
- Busca por nome/endereço sem CNPJ atualmente usa dados internos do tenant. Provedores externos por nome/endereço devem ser adicionados com contrato/API licenciada, timeout, cache e rate limit.
