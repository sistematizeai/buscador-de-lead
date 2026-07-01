# Controles de Seguranca: Rate Limit, BOLA, RBAC, RLS e LGPD

## Objetivo

Este documento registra o estado implementado dos controles pedidos para uso em producao do Buscador de Lead. Ele cobre rate limit, Broken Object Level Authorization, Broken Access Control, RLS e controles LGPD.

## Rate Limit

Implementado no backend com bucket persistido na tabela `security_rate_limit_buckets`, usando incremento atomico no PostgreSQL. Isso funciona entre multiplos processos/instancias porque o contador nao fica mais em memoria local.

Politicas aplicadas:

- `register`: IP e e-mail, 10 por IP/hora e 3 por e-mail/hora.
- `login`: IP e combinacao e-mail/IP, 5 tentativas por 15 minutos.
- `password_reset.request`: e-mail e IP, 3 por e-mail/30 min e 10 por IP/30 min.
- `company_search.cnpj`: usuario e workspace, 30 por usuario/hora e 100 por workspace/hora.
- `company_search.name_address`: usuario e workspace, 20 por usuario/hora e 80 por workspace/hora.
- `company_search.save_to_crm`: usuario, 60 por hora.
- `crm.export`: usuario, 5 por hora.
- `settings.manage_integrations`, `settings.create_api_key`, `settings.delete_api_key`: usuario, 10 por hora.

Quando o limite e atingido, a API retorna HTTP 429, informa `retryAfterSeconds` e registra `rate_limit_exceeded` em `security_audit_logs`.

## BOLA

Regra adotada: todo recurso multitenant deve ser lido ou modificado com o `workspaceId` vindo do JWT validado no backend.

Rotas/servicos reforcados:

- Campanhas: leitura, atualizacao, exclusao, start/retry e updates internos do scraper usam `campaignId + workspaceId`.
- Leads/CRM: leitura e update de CRM usam `leadId + workspaceId`.
- API Keys: exclusao usa `apiKeyId + workspaceId`.
- Busca de empresa: historico, dedupe e save-to-CRM usam `workspaceId` do contexto autenticado.
- Exportacao: sempre filtra leads por `workspaceId` e aplica permissao `crm.export`.

## RBAC / Broken Access Control

O backend usa `JwtGuard` para validar usuario, workspace, role, `sessionVersion` e membership real no banco. O `PermissionsGuard` valida permissao por acao e registra `access_denied` quando bloqueia.

Permissoes centrais cobertas:

- `analytics.read`
- `campaigns.read`, `campaigns.create`, `campaigns.update`, `campaigns.delete`, `campaigns.run`
- `company_search.use`, `company_search.view_history`, `company_search.save_to_crm`
- `crm.read`, `crm.create`, `crm.update`, `crm.delete`, `crm.export`, `crm.manage_status`, `crm.assign_owner`, `crm.view_sensitive_data`
- `settings.read`, `settings.manage_integrations`, `settings.manage_api_keys`
- `tenant.read`, `tenant.update`, `tenant.manage_users`
- `admin.access`, `admin.audit_logs`, `admin.security_settings`

## RLS

RLS foi ativado no Supabase para as tabelas tenant principais e filhas:

- `campaigns`, `leads`, `contacts`, `integrations`, `api_keys`;
- `company_search_logs`, `security_audit_logs`, `security_rate_limit_buckets`;
- `lead_activities`, `follow_ups`.

Controles aplicados:

- policies baseadas em `app_security.current_workspace_id()`;
- `FORCE ROW LEVEL SECURITY` nas tabelas protegidas;
- role `buscador_lead_app` com `NOBYPASSRLS`;
- `PrismaService.withWorkspace()` define `app.workspace_id` com `set_config(..., true)` dentro de transacao;
- services tenant executam leituras e escritas dentro desse contexto.

Validacao executada em 2026-07-01:

- role de app retornou `rolbypassrls=false`;
- sem `app.workspace_id`, `lead.count()` retornou `0`;
- com workspace A, a role enxergou apenas os leads do workspace A;
- consulta ao workspace B dentro do contexto do workspace A retornou `0`;
- insert/delete de auditoria com contexto de workspace funcionou.

## LGPD

Dados pessoais tratados no sistema:

- nome e e-mail de usuarios;
- IP e user-agent em eventos de seguranca;
- telefone, e-mail, endereco e contatos comerciais dos leads;
- historico de acoes em CRM e auditoria;
- chaves de API e credenciais de integracoes, que devem ser tratadas como segredo operacional.

Controles implementados:

- minimizacao em logs de auditoria;
- nao exposicao de secrets em responses de integracao;
- reset de senha com token hasheado e expiracao;
- exportacao controlada por permissao;
- isolamento por workspace no backend;
- auditoria de login, reset de senha, busca de empresa, save-to-CRM, rate limit e access denied.

Controles que ainda exigem politica/processo externo:

- politica de privacidade publica;
- termos de uso e registro de aceite;
- processo formal de exclusao/anonimizacao de titular;
- DPA/contratos com provedores;
- plano de retencao e backup;
- MFA obrigatorio para administradores;
- resposta formal a incidentes.

## Checklist de Validacao

- `pnpm test:unit`
- `pnpm deploy:check`
- `pnpm db:health`
- verificar `/api/health` em producao;
- verificar que `/api/docs` retorna 404 em producao;
- verificar que rotas protegidas retornam 401 sem token;
- testar login, criacao de campanha, busca individual, salvar no CRM, exportar e exclusao de campanha com usuario real.
