const updatedAt = "1 de julho de 2026";

export default function CookiesPage() {
  return (
    <main className="min-h-screen bg-slate-50 px-5 py-10 text-slate-900">
      <article className="mx-auto max-w-4xl rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-10">
        <p className="text-sm font-medium text-purple-700">Buscador de Lead</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight">Politica de Cookies</h1>
        <p className="mt-2 text-sm text-slate-500">Ultima atualizacao: {updatedAt}</p>

        <section className="mt-8 space-y-4 text-sm leading-7 text-slate-700">
          <p>
            No estado atual, o Buscador de Lead nao usa cookies opcionais de marketing ou analytics no frontend.
            A sessao autenticada e mantida por armazenamento local do navegador.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">Cookies essenciais</h2>
          <p>
            Se cookies tecnicos forem adicionados no futuro, eles deverao ser usados apenas para seguranca,
            autenticacao, preferencia operacional ou protecao contra abuso.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">Cookies opcionais</h2>
          <p>
            Caso analytics, remarketing, pixel, chat externo ou ferramentas semelhantes sejam ativados, o sistema
            devera exibir aviso e controle de consentimento antes de carregar tecnologias nao essenciais.
          </p>
          <h2 className="text-xl font-semibold text-slate-950">Recomendacao tecnica</h2>
          <p>
            Para producao com dominio proprio, a proxima evolucao recomendada e migrar a sessao para cookie
            HttpOnly, Secure e SameSite adequado, usando BFF ou dominio compartilhado entre frontend e API.
          </p>
        </section>
      </article>
    </main>
  );
}
