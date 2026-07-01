"use client";

import Link from "next/link";
import { useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post<{ message: string; devResetUrl?: string }>("/auth/password-reset/request", { email });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível processar a solicitação agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl md:p-10">
      <div className="mb-8">
        <p className="text-sm text-blue-100">Segurança da conta</p>
        <h1 className="mt-2 text-2xl font-semibold">Esqueci minha senha</h1>
        <p className="mt-2 text-sm leading-6 text-white/75">
          Informe seu e-mail. A resposta é sempre neutra para proteger as contas contra enumeração.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {message && (
          <div className="flex gap-2 rounded-xl border border-emerald-300/30 bg-emerald-950/30 px-4 py-3 text-sm text-emerald-100">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{message}</span>
          </div>
        )}
        {error && (
          <div className="flex gap-2 rounded-xl border border-red-300/30 bg-red-950/30 px-4 py-3 text-sm text-red-100">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="email" className="text-white/90">E-mail</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="voce@empresa.com"
            className="h-11 rounded-xl bg-white text-slate-900"
            required
          />
        </div>

        <Button className="h-11 w-full rounded-xl bg-[#002c66] text-white hover:bg-[#001e4d]" disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Enviar link de redefinição
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="text-blue-100 hover:text-white">
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
