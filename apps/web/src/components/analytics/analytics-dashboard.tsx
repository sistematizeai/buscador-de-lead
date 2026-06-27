"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3, CircleDollarSign, Loader2, Megaphone, PieChart as PieChartIcon, Plus, Sparkles, Target, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHero } from "@/components/ui/page-hero";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";
import { api } from "@/lib/api";
import { crmStatusLabel } from "@/lib/labels";

interface Overview {
  totalLeads: number;
  activeCampaigns: number;
  conversionRate: string;
  dealsWon: number;
  crmPipeline: Array<{ status: string; count: number }>;
}

interface IndustryRow {
  category: string | null;
  _count: { id: number };
  _avg: { score: number | null };
}

const CRM_COLORS: Record<string, string> = {
  new: "#94a3b8",
  contacted: "#60a5fa",
  replied: "#818cf8",
  meeting: "#a78bfa",
  proposal: "#f59e0b",
  won: "#34d399",
  lost: "#f87171",
  contact_later: "#38bdf8",
};

export function AnalyticsDashboard() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [industries, setIndustries] = useState<IndustryRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get<Overview>("/analytics"),
      api.get<IndustryRow[]>("/analytics/industries"),
    ])
      .then(([currentOverview, currentIndustries]) => {
        setOverview(currentOverview);
        setIndustries(currentIndustries);
      })
      .catch(() => undefined)
      .finally(() => setLoading(false));
  }, []);

  const funnelData = (overview?.crmPipeline ?? []).map((item) => ({
    name: crmStatusLabel[item.status] ?? item.status,
    value: item.count,
    color: CRM_COLORS[item.status] ?? "#94a3b8",
  }));

  const industryData = industries
    .filter((row) => row.category)
    .slice(0, 8)
    .map((row) => ({
      name: row.category!,
      leads: row._count.id,
      avgScore: Math.round(row._avg.score ?? 0),
    }));

  const hasAnalytics = industryData.length > 0 || funnelData.some((item) => item.value > 0);
  const stats = [
    { label: "Total de leads", value: overview?.totalLeads.toLocaleString() ?? "0", icon: Users, note: "Volume coletado pelas campanhas" },
    { label: "Taxa de conversão", value: overview?.conversionRate ?? "0%", icon: Target, note: "Avanço no funil comercial" },
    { label: "Negócios ganhos", value: overview?.dealsWon.toString() ?? "0", icon: Trophy, note: "Leads fechados como ganho" },
    { label: "Campanhas ativas", value: overview?.activeCampaigns.toString() ?? "0", icon: Megaphone, note: "Coletas em andamento agora" },
  ];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHero
        icon={BarChart3}
        eyebrow="Analytics"
        title="Leitura comercial dos seus leads"
        description="Acompanhe nichos, qualidade dos leads e avanço do funil assim que suas campanhas começarem a coletar dados."
        action={(
          <Button asChild className="rounded-xl bg-purple-600 hover:bg-purple-700">
            <Link href="/campaigns/new"><Plus className="mr-2 h-4 w-4" />Nova campanha</Link>
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((item) => (
          <Card key={item.label} className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02]">
            <CardContent className="p-5">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <item.icon className="h-5 w-5" />
                </div>
                <Badge variant={item.value === "0" || item.value === "0%" ? "secondary" : "success"} className="text-[11px]">
                  {item.value === "0" || item.value === "0%" ? "sem dados" : "ativo"}
                </Badge>
              </div>
              <p className="text-3xl font-bold text-slate-950">{item.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-700">{item.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-500">{item.note}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between gap-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Sparkles className="h-4 w-4 text-purple-500" />
                Leads por nicho
              </CardTitle>
              <Badge variant="outline" className="text-xs">Score médio + volume</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {industryData.length === 0 ? (
              <PremiumEmptyState
                icon={BarChart3}
                title="Os gráficos serão preenchidos após a primeira coleta"
                description="Crie uma campanha com nicho e região definidos. Assim que os leads forem captados, você verá volume por segmento e score médio aqui."
                action={<Button asChild size="sm" className="rounded-xl bg-purple-600 hover:bg-purple-700"><Link href="/campaigns/new">Criar campanha</Link></Button>}
              />
            ) : (
              <ResponsiveContainer width="100%" height={270}>
                <BarChart data={industryData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "12px",
                      fontSize: "12px",
                    }}
                  />
                  <Bar dataKey="leads" fill="#8b5cf6" radius={[6, 6, 0, 0]} name="Total de leads" />
                  <Bar dataKey="avgScore" fill="#10b981" radius={[6, 6, 0, 0]} name="Score médio" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02]">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <PieChartIcon className="h-4 w-4 text-purple-500" />
              Funil CRM
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!hasAnalytics ? (
              <PremiumEmptyState
                icon={CircleDollarSign}
                title="Funil aguardando leads"
                description="Quando você marcar leads como contatados, proposta ou ganho, o funil passa a mostrar a evolução comercial."
                className="py-8"
              />
            ) : (
              <>
                <div className="mb-4 flex justify-center">
                  <PieChart width={180} height={180}>
                    <Pie data={funnelData} cx={85} cy={85} innerRadius={50} outerRadius={80} paddingAngle={2} dataKey="value">
                      {funnelData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                  </PieChart>
                </div>
                <div className="space-y-2">
                  {funnelData.map((item) => (
                    <div key={item.name} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span className="text-slate-600">{item.name}</span>
                      </div>
                      <span className="font-semibold text-slate-950">{item.value}</span>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {!hasAnalytics && (
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-white shadow-sm shadow-purple-950/[0.03]">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-slate-950">Jornada recomendada para começar</p>
              <p className="mt-1 text-sm text-slate-600">Defina região, escolha o nicho, rode a campanha e acompanhe o funil pelos dados coletados.</p>
            </div>
            <Button asChild variant="outline" className="rounded-xl bg-white">
              <Link href="/campaigns/new">Configurar primeira busca</Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
