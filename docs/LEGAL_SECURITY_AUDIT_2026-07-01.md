# Auditoria juridica, seguranca e pre-producao

Data: 2026-07-01

## A. Resumo executivo

O Buscador de Lead esta estruturado como SaaS multitenant com frontend Next.js na Vercel,
backend NestJS no Render e PostgreSQL/Supabase via Prisma. O isolamento principal hoje e
feito na aplicacao por `workspaceId` vindo do JWT, com RBAC, rate limit persistido e logs de
auditoria. O projeto esta publicavel para MVP privado/controlado, mas ainda exige configuracoes
manuais de cloud, revisao juridica final e rotacao dos tokens que foram compartilhados fora de
cofre.

## B. Riscos criticos encontrados

| Risco | Severidade | Status |
| --- | --- | --- |
| Tokens de deploy/API foram compartilhados em chat | Critico | Rotacao manual necessaria |
| Sessao do frontend fica em `localStorage` | Alto | Risco documentado; migrar para HttpOnly/BFF |
| RLS do Supabase aplicado com role sem bypass | Reduzido | Policies ativas e API usando contexto transacional por workspace |
| API keys internas eram gravadas em texto puro | Alto | Corrigido para hash em novas chaves |
| Headers de seguranca do frontend nao estavam definidos | Medio | Corrigido no `next.config.ts` |
| Cadastro aceitava senha mais fraca que reset | Medio | Corrigido para politica forte |
| Termos/privacidade publicos inexistentes | Medio | Corrigido com paginas publicas iniciais |

## C. Auditoria de frontend

- Variaveis publicas usadas pelo frontend: `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_APP_URL`.
- Nao foram encontrados segredos backend com prefixo `NEXT_PUBLIC_`.
- Login/cadastro armazenam JWT em `localStorage`; isso funciona com Render/Vercel, mas aumenta impacto de XSS.
- Foram adicionados headers CSP, HSTS, frame deny, referrer policy, permission policy, COOP e CORP.
- Botoes sociais sem backend real foram removidos para nao induzir uso inexistente.
- Cadastro agora exige aceite dos Termos e Politica por checkbox obrigatorio.

## D. Auditoria Vercel

- Frontend deve conter somente variaveis `NEXT_PUBLIC_*`.
- Necessario confirmar no painel/CLI que nao existem `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL`,
  `DIRECT_URL`, tokens GitHub/Render/Vercel ou service-role keys no projeto Vercel.
- Source maps de browser em producao foram desativados explicitamente por `productionBrowserSourceMaps: false`.

## E. Auditoria Supabase

- Banco usa schema Prisma com tabelas multitenant contendo `workspaceId`.
- Existe indice unico por workspace para dedupe de leads.
- RLS foi ligado com role de aplicacao `NOBYPASSRLS` e contexto `app.workspace_id` por transacao.
- Storage Supabase nao e usado pelo codigo atual; regras de bucket devem ser verificadas no painel se algum bucket existir.

## F. Segredos e tokens

- Segredos devem ficar apenas no backend/Render ou no provedor correto.
- Chaves de IA salvas em integracoes nao sao retornadas ao frontend; responses mostram apenas `configured`.
- Novas API keys internas sao armazenadas como `sha256:<hash>` e o valor bruto aparece somente na criacao.
- Tokens compartilhados em chat devem ser revogados e recriados.

## G. Isolamento multitenant

- JWT inclui `workspaceId` e `sessionVersion`.
- `JwtGuard` valida membership real do usuario no workspace.
- Campanhas, leads, exportacao, settings, company search e scraper filtram por workspace.
- RLS esta ativo como segunda camada de defesa para tabelas tenant principais e filhas.

## H. LGPD e governanca

- Dados tratados: usuarios, e-mails, logs, IP/user-agent, dados comerciais de leads, telefone, endereco,
  CNPJ, site, Instagram, anotacoes de CRM e historico.
- Necessario formalizar controlador, encarregado/DPO, canal de direitos do titular, retencao, backup,
  descarte e resposta a incidentes.

## I. Termos de uso

- Pagina publica criada em `/terms`.
- Conteudo cobre uso permitido, coleta de leads, seguranca de conta, IA, suspensao e contratacao futura.
- Precisa revisao juridica e preenchimento de dados empresariais antes de lancamento publico.

## J. Politica de privacidade

- Pagina publica criada em `/privacy`.
- Conteudo cobre dados tratados, finalidades, compartilhamento, bases legais, direitos, retencao e seguranca.
- Precisa canal oficial de atendimento e identificacao do controlador.

## K. CDC e contratacao online

- Fluxo atual nao possui checkout ativo.
- Antes de venda paga, publicar preco, plano, renovacao, cancelamento, suporte, reembolso e comprovante de aceite.
- Cadastro agora exige aceite explicito, mas ainda nao grava versao/data do aceite no banco.

## L. Testes executados

Comandos recomendados para este pacote:

```bash
pnpm test:unit
pnpm deploy:check
pnpm db:health
```

## M. Arquivos alterados

- `apps/web/next.config.ts`
- `apps/web/src/security-headers.spec.ts`
- `apps/web/src/app/(legal)/terms/page.tsx`
- `apps/web/src/app/(legal)/privacy/page.tsx`
- `apps/web/src/app/(legal)/cookies/page.tsx`
- `apps/web/src/components/auth/login-form.tsx`
- `apps/web/src/components/auth/register-form.tsx`
- `apps/api/src/auth/auth.service.ts`
- `apps/api/src/auth/dto/register.dto.ts`
- `apps/api/src/auth/auth.service.spec.ts`
- `apps/api/src/settings/settings.service.ts`
- `apps/api/src/settings/settings.service.spec.ts`

## N. Configuracoes manuais necessarias

- Rotacionar GitHub token, Render token, Vercel token e qualquer chave de IA compartilhada fora de cofre.
- Confirmar Vercel envs: somente `NEXT_PUBLIC_API_URL` e `NEXT_PUBLIC_APP_URL`.
- Confirmar Render envs sensiveis: `DATABASE_URL`, `DIRECT_URL`, `JWT_SECRET`, `OPENAI_*`, `SCRAPER_*`.
- Configurar dominio proprio para migrar sessao para cookie HttpOnly com arquitetura BFF ou API sob mesmo dominio.
- Definir e-mail juridico/DPO e dados da empresa nos documentos legais.

## O. Checklist pre-producao

- Builds e testes passando.
- Headers presentes no frontend publicado.
- `/api/docs` fechado em producao.
- Rotas protegidas retornando 401 sem token.
- Banco respondendo ao `db:health`.
- Backup/retencao configurados no provedor.
- Tokens rotacionados.
- Politicas legais revisadas.

## P. Riscos residuais

- Nenhum sistema deve ser declarado 100% seguro.
- `localStorage` para JWT segue como risco ate migracao de sessao.
- RLS aplicado no Supabase em 2026-07-01; manter validacao apos novas migracoes.
- Aceite legal ainda nao e historificado em tabela propria.
- Scraping pode sofrer bloqueio, captcha, termos de plataforma e variacao de disponibilidade.
