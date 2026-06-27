"use client";

import Link from "next/link";
import { ArrowRight, KeyRound, Mail, MessageCircle, Plug, Send, Webhook, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";

const integrations = [
  {
    id: "whatsapp",
    name: "WhatsApp Business",
    description: "Envie mensagens para leads com textos gerados por IA e organize follow-ups.",
    icon: MessageCircle,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    status: "Em breve",
    category: "Mensagens",
  },
  {
    id: "gmail",
    name: "Gmail",
    description: "Envie e-mails para leads pelo Buscador de Lead usando sua conta Gmail.",
    icon: Mail,
    color: "text-red-500",
    bg: "bg-red-50",
    status: "Em breve",
    category: "Mensagens",
  },
  {
    id: "telegram",
    name: "Telegram",
    description: "Receba alertas quando campanhas terminarem ou leads mudarem de status.",
    icon: Send,
    color: "text-blue-500",
    bg: "bg-blue-50",
    status: "Em breve",
    category: "Notificações",
  },
  {
    id: "webhook",
    name: "Webhook",
    description: "Envie leads para qualquer endpoint HTTP e conecte seu próprio backend.",
    icon: Webhook,
    color: "text-orange-500",
    bg: "bg-orange-50",
    status: "Em breve",
    category: "Automação",
  },
  {
    id: "zapier",
    name: "Zapier",
    description: "Conecte o Buscador de Lead a milhares de apps sem escrever código.",
    icon: Zap,
    color: "text-amber-500",
    bg: "bg-amber-50",
    status: "Em breve",
    category: "Automação",
  },
  {
    id: "n8n",
    name: "n8n",
    description: "Monte pipelines self-hosted para CRM, enriquecimento e abordagens.",
    icon: Plug,
    color: "text-purple-500",
    bg: "bg-purple-50",
    status: "Em breve",
    category: "Automação",
  },
];

const categories = [...new Set(integrations.map((integration) => integration.category))];

export function IntegrationsPage() {
  return (
    <div className="max-w-6xl space-y-6">
      <PageHero
        icon={Plug}
        eyebrow="Hub de integrações"
        title="Conecte seu fluxo comercial"
        description="Centralize canais, automações e API para transformar os leads coletados em rotina comercial."
        action={(
          <Button asChild variant="outline" className="rounded-xl bg-white">
            <Link href="/settings">Configurar IA <ArrowRight className="ml-2 h-4 w-4" /></Link>
          </Button>
        )}
      />

      <Card className="overflow-hidden border-purple-200 bg-gradient-to-r from-purple-700 via-violet-700 to-blue-700 text-white shadow-lg shadow-purple-700/20">
        <CardContent className="flex flex-col gap-5 p-6 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/20">
              <KeyRound className="h-6 w-6" />
            </div>
            <div>
              <p className="text-lg font-semibold">API REST do Buscador de Lead</p>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-purple-100">
                Acesse leads, campanhas e exportações por código. Use chaves de API para integrar com n8n, CRM, planilhas e automações próprias.
              </p>
            </div>
          </div>
          <div className="flex shrink-0 gap-2">
            <Button size="sm" variant="secondary" asChild className="rounded-xl bg-white text-purple-700 hover:bg-purple-50">
              <a href={`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/api/docs`} target="_blank" rel="noreferrer">
                Docs Swagger
              </a>
            </Button>
            <Button size="sm" asChild className="rounded-xl bg-slate-950 text-white hover:bg-slate-900">
              <Link href="/settings">Chaves de API</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {categories.map((category) => (
        <section key={category} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-[0.18em] text-slate-500">{category}</h2>
              <p className="mt-1 text-sm text-slate-500">Conexões para reduzir trabalho manual depois da coleta.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {integrations
              .filter((integration) => integration.category === category)
              .map((integration) => (
                <Card key={integration.id} className="group border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] transition-all hover:-translate-y-0.5 hover:border-purple-200 hover:shadow-lg hover:shadow-purple-950/[0.06]">
                  <CardContent className="p-5">
                    <div className="mb-4 flex items-start justify-between gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-2xl ${integration.bg}`}>
                        <integration.icon className={`h-6 w-6 ${integration.color}`} />
                      </div>
                      <Badge variant="secondary" className="rounded-full bg-slate-100 text-slate-600">
                        {integration.status}
                      </Badge>
                    </div>
                    <h3 className="text-base font-semibold text-slate-950">{integration.name}</h3>
                    <p className="mt-2 min-h-12 text-sm leading-6 text-slate-500">{integration.description}</p>
                    <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                      <span className="text-xs font-medium text-slate-400">Planejado</span>
                      <Button variant="ghost" size="sm" className="h-8 rounded-xl text-purple-600 hover:bg-purple-50 hover:text-purple-700">
                        Ver detalhes <ArrowRight className="ml-1 h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
