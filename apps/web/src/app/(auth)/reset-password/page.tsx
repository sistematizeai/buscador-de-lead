"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { api } from "@/lib/api";

function passwordChecks(password: string) {
  return {
    length: password.length >= 10,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /\d/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };
}

function ResetPasswordForm() {
  const params = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const checks = useMemo(() => passwordChecks(password), [password]);
  const strong = Object.values(checks).every(Boolean);
  const matches = password.length > 0 && password === confirm;

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!token) {
      setError("Token ausente. Solicite um novo link de redefinição.");
      return;
    }
    if (!strong || !matches) {
      setError("Revise a força da senha e a confirmação.");
      return;
    }

    setLoading(true);
    setError("");
    setMessage("");
    try {
      const response = await api.post<{ message: string }>("/auth/password-reset/confirm", { token, password });
      setMessage(response.message);
      setPassword("");
      setConfirm("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível redefinir a senha agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full rounded-3xl border border-white/20 bg-white/10 p-8 text-white shadow-2xl backdrop-blur-xl md:p-10">
      <div className="mb-8">
        <p className="text-sm text-blue-100">Nova senha</p>
        <h1 className="mt-2 text-2xl font-semibold">Redefinir senha</h1>
        <p className="mt-2 text-sm leading-6 text-white/75">
          Crie uma senha forte. Após a troca, sessões anteriores são invalidadas.
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
          <Label htmlFor="password" className="text-white/90">Nova senha</Label>
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-11 rounded-xl bg-white text-slate-900"
            required
          />
        </div>
        <div className="grid grid-cols-1 gap-2 rounded-2xl bg-white/10 p-4 text-xs text-white/80 sm:grid-cols-2">
          <span className={checks.length ? "text-emerald-200" : ""}>10+ caracteres</span>
          <span className={checks.upper ? "text-emerald-200" : ""}>Letra maiúscula</span>
          <span className={checks.lower ? "text-emerald-200" : ""}>Letra minúscula</span>
          <span className={checks.number ? "text-emerald-200" : ""}>Número</span>
          <span className={checks.special ? "text-emerald-200" : ""}>Caractere especial</span>
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirm" className="text-white/90">Confirmar senha</Label>
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            className="h-11 rounded-xl bg-white text-slate-900"
            required
          />
        </div>

        <Button className="h-11 w-full rounded-xl bg-[#002c66] text-white hover:bg-[#001e4d]" disabled={loading || !strong || !matches}>
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          Redefinir senha
        </Button>
      </form>

      <div className="mt-6 text-center text-sm">
        <Link href="/login" className="text-blue-100 hover:text-white">
          Ir para login
        </Link>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div className="text-center text-white">Carregando...</div>}>
      <ResetPasswordForm />
    </Suspense>
  );
}
