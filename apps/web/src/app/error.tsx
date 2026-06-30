"use client";

import Link from "next/link";
import { AlertTriangle, RotateCcw } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  console.error(error);

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-50 px-4 py-10 text-slate-950">
      <section className="w-full max-w-xl rounded-lg border border-slate-200 bg-white p-8 shadow-sm">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
          <AlertTriangle className="h-7 w-7" aria-hidden="true" />
        </div>
        <h1 className="text-2xl font-semibold tracking-normal">Algo saiu do fluxo esperado</h1>
        <p className="mt-3 text-base leading-7 text-slate-600">
          O sistema preservou a sessão. Tente carregar esta tela novamente ou volte para o painel para continuar.
        </p>
        {error.digest ? <p className="mt-4 text-sm text-slate-500">Código técnico: {error.digest}</p> : null}
        <div className="mt-8 flex flex-col gap-3 sm:flex-row">
          <Button type="button" onClick={reset} className="gap-2 rounded-xl bg-purple-600 hover:bg-purple-700">
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Tentar novamente
          </Button>
          <Button asChild type="button" variant="outline" className="rounded-xl">
            <Link href="/dashboard">Voltar ao painel</Link>
          </Button>
        </div>
      </section>
    </main>
  );
}
