const updatedAt = "1 de julho de 2026";

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-purple-700">Buscador de Lead</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Politica de Privacidade</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {updatedAt}</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            Esta Politica explica como o Buscador de Lead trata dados pessoais e dados empresariais associados
            a usuarios, workspaces e leads comerciais. Antes de publicacao definitiva, o operador deve preencher
            razao social, CNPJ, encarregado/DPO e canal de atendimento.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">1. Dados tratados</h2>
          <p>
            Podemos tratar nome, e-mail, senha hasheada, workspace, logs de seguranca, IP, user-agent, dados de
            empresas prospectadas, telefone, endereco, site, Instagram, CNPJ, anotacoes de CRM e historico de
            atividades.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">2. Finalidades</h2>
          <p>
            Os dados sao usados para autenticar usuarios, operar campanhas, deduplicar leads, enriquecer
            informacoes comerciais, gerar analises por IA, exportar CRM, prevenir abuso, registrar auditoria e
            manter o servico funcionando.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">3. Compartilhamento</h2>
          <p>
            A operacao pode depender de provedores de infraestrutura e processamento, como Vercel, Render,
            Supabase/PostgreSQL, provedores de IA compativeis com OpenAI/OpenRouter, BrasilAPI e fontes publicas
            consultadas. Chaves de API devem permanecer no backend e nao devem ser publicadas no frontend.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">4. Bases legais</h2>
          <p>
            A base legal depende do caso concreto. Em regra, podem existir execucao de contrato, legitimo
            interesse, cumprimento de obrigacao legal e consentimento quando aplicavel. O operador do sistema
            deve manter avaliacao propria para campanhas de prospeccao.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">5. Direitos do titular</h2>
          <p>
            Titulares podem solicitar confirmacao de tratamento, acesso, correcao, exclusao, portabilidade,
            revisao de decisoes automatizadas quando aplicavel e informacoes sobre compartilhamento. O canal de
            atendimento definitivo deve ser informado pelo controlador.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">6. Retencao e seguranca</h2>
          <p>
            Dados devem ser mantidos apenas pelo tempo necessario para operacao, auditoria, obrigacoes legais e
            defesa de direitos. O sistema possui autenticacao, permissoes, rate limit, logs e segregacao por
            workspace, mas seguranca tambem depende de configuracao correta de cloud, senhas, backups e acessos.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">7. Cookies e armazenamento local</h2>
          <p>
            O produto atual usa armazenamento local do navegador para manter a sessao autenticada. Nao ha banner
            de cookies para marketing enquanto nao houver cookies opcionais ou rastreadores nao essenciais.
            Veja tambem a Politica de Cookies.
          </p>
        </section>
      </article>
    </main>
  );
}
