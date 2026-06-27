"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useCampaigns, type Campaign } from "@/hooks/use-campaigns";
import { campaignStatusLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import {
  ChevronRight,
  Loader2,
  MapPin,
  Megaphone,
  MoreHorizontal,
  Plus,
  Search,
  Star,
  Users,
} from "lucide-react";

function StatusBadge({ campaign }: { campaign: Campaign }) {
  if (campaign.status === "running") {
    return (
      <div className="flex items-center gap-1.5">
        <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
        <span className="text-xs font-medium text-blue-600">{campaign.progress}%</span>
      </div>
    );
  }
  if (campaign.status === "completed") return <Badge variant="success">Concluída</Badge>;
  if (campaign.status === "failed") return <Badge variant="destructive">Falhou</Badge>;
  if (campaign.status === "draft") return <Badge variant="secondary">Rascunho</Badge>;
  return <Badge variant="outline">{campaignStatusLabel[campaign.status] ?? campaign.status}</Badge>;
}

export function CampaignsList() {
  const { campaigns, loading } = useCampaigns();
  const [search, setSearch] = useState("");

  const filtered = campaigns.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(search.toLowerCase()) ||
      campaign.industry.toLowerCase().includes(search.toLowerCase()) ||
      campaign.location.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar campanhas por nome, nicho ou região..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm focus-visible:bg-white"
          />
        </div>
        <Button asChild className="h-11 rounded-xl bg-purple-600 px-5 shadow-sm shadow-purple-500/20 hover:bg-purple-700 sm:ml-auto">
          <Link href="/campaigns/new"><Plus className="mr-2 h-4 w-4" />Nova campanha</Link>
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((campaign) => (
            <Card key={campaign.id} className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] transition-all hover:border-purple-200 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 shadow-sm shadow-purple-500/20">
                    <Megaphone className="h-5 w-5 text-white" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-0.5 flex flex-wrap items-center gap-2">
                      <h3 className="text-sm font-semibold text-slate-950">{campaign.name}</h3>
                      <StatusBadge campaign={campaign} />
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1 capitalize"><Megaphone className="h-3 w-3" />{campaign.industry}</span>
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{campaign.location}</span>
                      <span className="hidden sm:block">{formatDate(campaign.createdAt)}</span>
                    </div>
                    {campaign.status === "running" && (
                      <Progress value={campaign.progress} className="mt-2 h-1 max-w-[200px]" />
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-center">
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-center gap-1"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-semibold">{campaign.totalLeads}</span></div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="hidden sm:block">
                      <div className="flex items-center justify-center gap-1"><Star className="h-3 w-3 text-amber-500" /><span className="text-sm font-semibold">{campaign.priorityLeads}</span></div>
                      <p className="text-xs text-muted-foreground">Prioridade</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl"><MoreHorizontal className="h-4 w-4" /></Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl" asChild>
                      <Link href={`/campaigns/${campaign.id}`}><ChevronRight className="h-4 w-4" /></Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {filtered.length === 0 && !loading && (
            <Card className="border-dashed border-slate-300 bg-white">
              <CardContent className="py-16 text-center">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-50 text-purple-600">
                  <Megaphone className="h-6 w-6" />
                </div>
                <p className="font-medium text-slate-950">Nenhuma campanha encontrada</p>
                <p className="mb-4 text-sm text-muted-foreground">Crie sua primeira campanha para começar a buscar leads</p>
                <Button asChild className="rounded-xl bg-purple-600 hover:bg-purple-700">
                  <Link href="/campaigns/new"><Plus className="mr-2 h-4 w-4" />Nova campanha</Link>
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
