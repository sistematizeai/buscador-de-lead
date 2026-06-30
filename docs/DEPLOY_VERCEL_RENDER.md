# Deploy Vercel + Render

Este projeto fica separado em dois serviços:

- Frontend: Next.js em `apps/web`, hospedado na Vercel.
- Backend: NestJS em `apps/api`, hospedado no Render.

## 1. Preflight local

Rode antes de subir:

```bash
pnpm install --frozen-lockfile
pnpm deploy:check
pnpm db:health
```

O `pnpm deploy:check` gera o Prisma Client, roda lint da API/web e compila os dois apps.

## 2. Backend no Render

Use o `render.yaml` na raiz do repositório. Ele cria um Web Service Docker chamado `buscador-lead-api`.

Configuração importante:

- Dockerfile: `apps/api/Dockerfile`
- Health check: `/api/health`
- Start command: definido no Dockerfile
- Schema do banco: `preDeployCommand: pnpm --filter @leadsync/database db:push`

Variáveis obrigatórias no Render:

```env
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
JWT_SECRET=<valor forte gerado no Render>
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
CORS_ALLOWED_ORIGINS=https://seu-projeto.vercel.app
```

Variáveis de IA no Render:

```env
OPENAI_API_KEY=<sua chave do provedor>
OPENAI_BASE_URL=https://openrouter.ai/api/v1
OPENAI_MODEL=gpt-4o-mini
OPENAI_MAX_TOKENS=1000
```

Variáveis de busca no Render:

```env
SCRAPER_PROVIDER=gosom
GOSOM_BINARY_PATH=tools/bin/gosom-google-maps-scraper
GOSOM_TIMEOUT_MS=120000
GOSOM_DEPTH=1
SCRAPER_QUERY_RETRIES=2
SCRAPER_MAX_ROUNDS=6
SCRAPER_ALLOW_MOCK_FALLBACK=false
INSTAGRAM_LOOKUP_ENABLED=true
INSTAGRAM_LOOKUP_MAX_PER_CAMPAIGN=100
```

Observação crítica: o binário local `tools/bin/gosom-google-maps-scraper.exe` é Windows e não roda no Render Linux. Por isso o `apps/api/Dockerfile` baixa o binário oficial Linux da release `v1.16.1` do Gosom para `tools/bin/gosom-google-maps-scraper`. O Dockerfile também executa `tools/bin/gosom-google-maps-scraper --help` no build para falhar cedo se o binário não estiver funcional.

O build está fixado na release `ARG GOSOM_VERSION=1.16.1` no `apps/api/Dockerfile`. Para atualizar o Gosom no futuro, troque essa versão, confirme que existe o asset `google_maps_scraper-<versão>-linux-amd64` e rode os testes antes de redeploy.

## 3. Frontend na Vercel

Importe o mesmo repositório na Vercel e configure:

- Root Directory: `apps/web`
- Framework Preset: Next.js
- Install Command: vem de `apps/web/vercel.json`
- Build Command: vem de `apps/web/vercel.json`
- Output Directory: `.next`

Variáveis obrigatórias na Vercel:

```env
NEXT_PUBLIC_API_URL=https://buscador-lead-api.onrender.com/api
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
```

Somente variáveis `NEXT_PUBLIC_*` devem ir para o frontend. Não coloque `OPENAI_API_KEY`, `JWT_SECRET`, `DATABASE_URL` ou `DIRECT_URL` na Vercel.

## 4. Ordem correta de publicação

1. Suba o backend no Render.
2. Copie a URL pública do Render, por exemplo `https://buscador-lead-api.onrender.com`.
3. Configure na Vercel `NEXT_PUBLIC_API_URL=https://buscador-lead-api.onrender.com/api`.
4. Configure no Render:

```env
NEXT_PUBLIC_APP_URL=https://seu-projeto.vercel.app
CORS_ALLOWED_ORIGINS=https://seu-projeto.vercel.app
```

5. Faça redeploy do Render.
6. Faça redeploy da Vercel.

## 5. Validação online

Backend:

```bash
curl https://buscador-lead-api.onrender.com/api/health
```

Resposta esperada:

```json
{
  "status": "ok",
  "service": "leadsync-api"
}
```

Frontend:

- abrir a URL da Vercel;
- criar login ou entrar com uma conta existente;
- abrir `Configurações`;
- verificar status de banco e IA;
- criar campanha pequena com 5 leads para testar o fluxo completo.

## 6. Atenções de produção

- Render Free pode dormir e atrasar a primeira chamada. Para scraping mais estável, use plano pago.
- Scraping pode sofrer bloqueio, CAPTCHA e timeout. O sistema tem retries, mas a infraestrutura precisa de tempo suficiente.
- `db:push` é prático para este MVP. Quando o schema estabilizar, o ideal é migrar para Prisma migrations com `prisma migrate deploy`.
- Previews da Vercel usam URLs diferentes. Para liberar previews, prefira adicionar URLs exatas em `CORS_ALLOWED_ORIGINS`. Use `CORS_ALLOWED_HOST_SUFFIXES` só se entender o risco de liberar um sufixo inteiro.
