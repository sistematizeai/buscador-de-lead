"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { ArrowRight, ArrowUpRight, BarChart3, Loader2, Megaphone, Plus, TrendingUp, Trophy, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useCampaigns } from "@/hooks/use-campaigns";
import { api } from "@/lib/api";
import { formatDate } from "@/lib/utils";

interface Overview {
  totalLeads: number;
  activeCampaigns: number;
  conversionRate: string;
  dealsWon: number;
}

export function DashboardOverview() {
  const { campaigns, loading } = useCampaigns();
  const recent = campaigns.slice(0, 4);
  const [overview, setOverview] = useState<Overview | null>(null);

  useEffect(() => {
    api.get<Overview>("/analytics").then(setOverview).catch(() => undefined);
  }, []);

  const stats = [
    { title: "Total de leads", value: overview?.totalLeads.toLocaleString() ?? "-", icon: Users, color: "text-blue-500", bg: "bg-blue-500/10" },
    { title: "Campanhas ativas", value: overview?.activeCampaigns.toString() ?? "-", icon: Megaphone, color: "text-purple-500", bg: "bg-purple-500/10" },
    { title: "Taxa de conversão", value: overview?.conversionRate ?? "-", icon: TrendingUp, color: "text-emerald-500", bg: "bg-emerald-500/10" },
    { title: "Negócios ganhos", value: overview?.dealsWon.toString() ?? "-", icon: Trophy, color: "text-amber-500", bg: "bg-amber-500/10" },
  ];

  const trendData = campaigns.slice(-6).map((campaign) => ({
    date: new Date(campaign.createdAt).toLocaleDateString("pt-BR", { month: "short", day: "numeric" }),
    leads: campaign.totalLeads,
    won: campaign.priorityLeads,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-950/[0.03] sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">Bom dia</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Veja o que está acontecendo com seus leads hoje.
          </p>
        </div>
        <Button asChild className="w-full rounded-xl bg-purple-600 shadow-md shadow-purple-500/20 hover:bg-purple-700 sm:w-auto">
          <Link href="/campaigns/new">
            <Plus className="mr-2 h-4 w-4" />Nova campanha
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title} className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] transition-shadow hover:shadow-md">
            <CardContent className="p-4 sm:pt-6">
              <div className="mb-3 flex items-center justify-between">
                <div className={`rounded-xl p-2.5 ${stat.bg}`}>
                  <stat.icon className={`h-4 w-4 ${stat.color}`} />
                </div>
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-slate-950 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-sm text-muted-foreground">{stat.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-5">
        <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] lg:col-span-3">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-4 w-4 text-purple-500" />
                Tendência de geração de leads
              </CardTitle>
              <Badge variant="outline" className="text-xs">Últimas campanhas</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={trendData} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
                <defs>
                  <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="date" tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                    fontSize: "12px",
                  }}
                />
                <Area type="monotone" dataKey="leads" stroke="#8b5cf6" strokeWidth={2} fill="url(#g1)" name="Total de leads" />
                <Area type="monotone" dataKey="won" stroke="#10b981" strokeWidth={2} fill="url(#g2)" name="Leads prioritários" />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Campanhas recentes</CardTitle>
              <Button variant="ghost" size="sm" asChild className="h-7 px-2 text-xs">
                <Link href="/campaigns">Ver todas <ArrowRight className="ml-1 h-3 w-3" /></Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="space-y-2">
                {recent.map((campaign) => (
                  <Link
                    key={campaign.id}
                    href={`/campaigns/${campaign.id}`}
                    className="flex items-center gap-3 rounded-xl p-2 transition-colors hover:bg-slate-50"
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600">
                      <Megaphone className="h-4 w-4 text-white" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{campaign.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {campaign.totalLeads} leads - {formatDate(campaign.createdAt)}
                      </p>
                    </div>
                    {campaign.status === "running" && (
                      <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-blue-500" />
                    )}
                    {campaign.status === "completed" && (
                      <Badge variant="success" className="hidden py-0 text-[10px] sm:inline-flex">Concluída</Badge>
                    )}
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
