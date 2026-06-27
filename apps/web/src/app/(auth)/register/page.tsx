import type { Metadata } from "next";
import Link from "next/link";
import { AppLogo } from "@/components/brand/app-logo";
import { RegisterForm } from "@/components/auth/register-form";

export const metadata: Metadata = { title: "Criar conta | Buscador de Lead" };

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-purple-900/20 via-transparent to-transparent" />
      <div className="relative z-10 w-full max-w-md px-4">
        <div className="text-center mb-8">
          <Link href="/" className="mb-5 inline-flex">
            <AppLogo inverse />
          </Link>
          <h1 className="text-2xl font-bold text-white">Crie sua conta</h1>
          <p className="text-slate-400 mt-1 text-sm">Comece a encontrar leads com IA gratuitamente</p>
        </div>
        <RegisterForm />
        <p className="text-center text-sm text-slate-500 mt-4">
          Já tem uma conta?{" "}
          <Link href="/login" className="text-purple-400 hover:text-purple-300 font-medium">Entrar</Link>
        </p>
      </div>
    </div>
  );
}
