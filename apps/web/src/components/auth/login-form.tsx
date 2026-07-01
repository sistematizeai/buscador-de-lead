"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Radar, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function LoginForm() {
  const router = useRouter();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await login(email, password);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao entrar");
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-white/10 backdrop-blur-xl border border-white/20 shadow-2xl rounded-3xl p-8 md:p-10 text-white relative overflow-hidden">
      {/* Glossy Overlay Highlight */}
      <div className="absolute -left-16 -top-16 w-32 h-32 bg-white/5 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header inside Card */}
      <div className="text-center mb-8">
        <div className="relative inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 text-white border border-white/25 shadow-inner mb-3">
          <Radar className="h-6 w-6 text-white" />
          <span className="absolute -right-1.5 -top-1.5 flex h-4.5 w-4.5 items-center justify-center rounded-full border-2 border-[#005ec4] bg-white text-blue-600">
            <MapPin className="h-2.5 w-2.5" />
          </span>
        </div>
        <div className="text-xl font-bold tracking-tight text-white mb-1">Buscador de Lead</div>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-semibold text-white">Login</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-200 bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 opacity-90" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-white/90 text-sm font-medium">
            E-mail
          </Label>
          <Input
            id="email"
            type="email"
            placeholder="username@gmail.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-white border-white/15 text-slate-800 placeholder:text-slate-400 rounded-xl h-11 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            required
          />
        </div>

        <div className="space-y-1.5 relative">
          <div className="flex justify-between items-center">
            <Label htmlFor="password" className="text-white/90 text-sm font-medium">
              Senha
            </Label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Senha"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-white border-white/15 text-slate-800 placeholder:text-slate-400 rounded-xl h-11 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            required
          />
          <div className="text-right mt-1.5">
            <a href="/forgot-password" className="text-xs text-blue-200 hover:text-white transition-colors">
              Esqueci minha senha
            </a>
          </div>
        </div>

        <Button
          type="submit"
          className="w-full bg-[#002c66] hover:bg-[#001e4d] text-white font-medium rounded-xl h-11 transition-all shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
          Entrar
        </Button>

        <p className="text-xs text-white/70 text-center mt-6">
          Ainda nao tem conta?{" "}
          <a href="/register" className="text-blue-200 hover:text-white font-medium underline underline-offset-2 transition-all">
            Criar conta
          </a>
        </p>
        <p className="text-center text-[11px] leading-5 text-white/60">
          Ao acessar, voce concorda com os{" "}
          <a href="/terms" className="text-blue-200 hover:text-white underline underline-offset-2">
            Termos de Uso
          </a>{" "}
          e com a{" "}
          <a href="/privacy" className="text-blue-200 hover:text-white underline underline-offset-2">
            Politica de Privacidade
          </a>
          .
        </p>
      </form>
    </div>
  );
}
