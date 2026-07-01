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
        <div className="text-xl font-bold tracking-tight text-white mb-1">LeadSync</div>
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
            Email
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
              Password
            </Label>
          </div>
          <Input
            id="password"
            type="password"
            placeholder="Password"
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
          Sign in
        </Button>

        {/* Divider */}
        <div className="relative my-6 flex items-center justify-center">
          <div className="border-t border-white/15 w-full absolute" />
          <span className="bg-gradient-to-r from-transparent via-[#005ec4] to-transparent px-3 text-xs text-white/70 relative z-10 font-normal">
            or continue with
          </span>
        </div>

        {/* Social Buttons */}
        <div className="flex items-center justify-between gap-3">
          {/* Google Button */}
          <button
            type="button"
            className="flex items-center justify-center rounded-xl bg-white border border-white/10 hover:bg-slate-100 h-11 flex-1 transition-all active:scale-95 shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
          </button>

          {/* GitHub Button */}
          <button
            type="button"
            className="flex items-center justify-center rounded-xl bg-white border border-white/10 hover:bg-slate-100 h-11 flex-1 transition-all active:scale-95 shadow-sm text-slate-900"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
            </svg>
          </button>

          {/* Facebook Button */}
          <button
            type="button"
            className="flex items-center justify-center rounded-xl bg-white border border-white/10 hover:bg-slate-100 h-11 flex-1 transition-all active:scale-95 shadow-sm"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="#1877F2">
              <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
            </svg>
          </button>
        </div>

        <p className="text-xs text-white/70 text-center mt-6">
          Don't have an account yet?{" "}
          <a href="/register" className="text-blue-200 hover:text-white font-medium underline underline-offset-2 transition-all">
            Register for free
          </a>
        </p>
      </form>
    </div>
  );
}
