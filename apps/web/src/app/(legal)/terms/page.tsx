const updatedAt = "1 de julho de 2026";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-purple-700">Buscador de Lead</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Termos de Uso</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {updatedAt}</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            Estes Termos regulam o uso do Buscador de Lead, sistema de prospeccao comercial com coleta,
            organizacao e analise de informacoes empresariais. Ao criar uma conta ou acessar o sistema, o
            usuario declara que leu e aceita estas condicoes.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">1. Uso permitido</h2>
          <p>
            O sistema deve ser usado para fins comerciais licitos, respeitando LGPD, Marco Civil da Internet,
            regras de plataformas consultadas, direitos de terceiros e normas de protecao ao consumidor. O
            usuario e responsavel por validar a base legal da prospeccao, manter opt-out quando aplicavel e
            usar mensagens comerciais adequadas.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">2. Coleta de leads</h2>
          <p>
            As buscas podem consultar fontes externas e mecanismos de pesquisa. Essas fontes podem limitar,
            bloquear, alterar ou remover acesso a dados. O sistema nao garante quantidade exata, completude,
            atualidade ou disponibilidade permanente de resultados.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">3. Conta e seguranca</h2>
          <p>
            O usuario deve manter credenciais protegidas, usar senhas fortes e nao compartilhar acesso. A
            operacao possui controles de autenticacao, permissoes, logs e isolamento por workspace, mas nenhum
            sistema conectado a internet deve ser tratado como invulneravel.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">4. Conteudo gerado por IA</h2>
          <p>
            Analises, pontuacoes e sugestoes comerciais geradas por IA sao apoio operacional. O usuario deve
            revisar abordagens, ofertas e comunicacoes antes de enviar a terceiros.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">5. Pagamentos e contratacao online</h2>
          <p>
            Caso planos pagos sejam ativados, preco, ciclo de cobranca, cancelamento, suporte, reembolso e
            renovacao deverao ser exibidos antes da contratacao. Enquanto nao houver checkout ativo, estes
            Termos nao representam oferta comercial paga.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">6. Suspensao</h2>
          <p>
            O acesso pode ser suspenso em caso de abuso, tentativa de burlar limites, scraping agressivo,
            violacao legal, risco a terceiros ou comprometimento de seguranca.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">7. Contato</h2>
          <p>
            Para duvidas sobre estes Termos, use o canal oficial informado pelo operador do sistema. Antes de
            uso publico, substitua este trecho pelo e-mail juridico/atendimento da empresa responsavel.
          </p>
        </section>
      </article>
    </main>
  );
}
