"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, AlertCircle, Radar, MapPin } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export function RegisterForm() {
  const router = useRouter();
  const { register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({ name: "", email: "", password: "", workspace: "" });

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((p) => ({ ...p, [k]: e.target.value }));

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await register(form.name, form.email, form.password, form.workspace);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao criar conta");
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
        <h2 className="text-2xl font-semibold text-white">Criar Conta</h2>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && (
          <div className="flex items-center gap-2 text-sm text-red-200 bg-red-950/30 border border-red-500/30 rounded-xl px-4 py-3">
            <AlertCircle className="w-4.5 h-4.5 flex-shrink-0 opacity-90" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-white/90 text-sm font-medium">
              Nome completo
            </Label>
            <Input
              id="name"
              placeholder="Seu nome"
              value={form.name}
              onChange={set("name")}
              className="bg-white border-white/15 text-slate-800 placeholder:text-slate-400 rounded-xl h-11 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="workspace" className="text-white/90 text-sm font-medium">
              Nome do workspace
            </Label>
            <Input
              id="workspace"
              placeholder="Minha empresa"
              value={form.workspace}
              onChange={set("workspace")}
              className="bg-white border-white/15 text-slate-800 placeholder:text-slate-400 rounded-xl h-11 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
              required
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-email" className="text-white/90 text-sm font-medium">
            E-mail
          </Label>
          <Input
            id="reg-email"
            type="email"
            placeholder="voce@empresa.com"
            value={form.email}
            onChange={set("email")}
            className="bg-white border-white/15 text-slate-800 placeholder:text-slate-400 rounded-xl h-11 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            required
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="reg-password" className="text-white/90 text-sm font-medium">
            Senha
          </Label>
          <Input
            id="reg-password"
            type="password"
            placeholder="Minimo de 10 caracteres, com numero e simbolo"
            value={form.password}
            onChange={set("password")}
            className="bg-white border-white/15 text-slate-800 placeholder:text-slate-400 rounded-xl h-11 focus:ring-2 focus:ring-blue-400 focus:border-transparent"
            required
            minLength={10}
          />
        </div>

        <label className="flex gap-3 rounded-xl border border-white/15 bg-white/10 px-3 py-3 text-xs leading-5 text-white/75">
          <input
            type="checkbox"
            required
            className="mt-1 h-4 w-4 shrink-0 rounded border-white/30 bg-white/20 text-blue-600 focus:ring-blue-300"
          />
          <span>
            Li e aceito os{" "}
            <a href="/terms" className="text-blue-200 hover:text-white underline underline-offset-2">
              Termos de Uso
            </a>{" "}
            e a{" "}
            <a href="/privacy" className="text-blue-200 hover:text-white underline underline-offset-2">
              Politica de Privacidade
            </a>
            .
          </span>
        </label>

        <Button
          type="submit"
          className="w-full bg-[#002c66] hover:bg-[#001e4d] text-white font-medium rounded-xl h-11 transition-all shadow-lg shadow-blue-950/20 flex items-center justify-center gap-2 mt-2"
          disabled={loading}
        >
          {loading && <Loader2 className="h-4.5 w-4.5 animate-spin" />}
          {loading ? "Criando conta..." : "Criar conta"}
        </Button>

        <p className="text-xs text-white/70 text-center mt-6">
          Já tem uma conta?{" "}
          <a href="/login" className="text-blue-200 hover:text-white font-medium underline underline-offset-2 transition-all">
            Entrar
          </a>
        </p>
      </form>
    </div>
  );
}
