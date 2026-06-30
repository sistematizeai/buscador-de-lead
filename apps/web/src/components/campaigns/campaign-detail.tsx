"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AlertTriangle, ArrowLeft, Download, Users, Star, TrendingUp, MapPin, Loader2, RotateCcw, Search } from "lucide-react";
import { useCampaign } from "@/hooks/use-campaigns";
import { useLeads } from "@/hooks/use-leads";
import { LeadsTable } from "@/components/leads/leads-table";
import { api } from "@/lib/api";
import { campaignStatusLabel } from "@/lib/labels";

export function CampaignDetail({ id }: { id: string }) {
  const { campaign, loading, refresh, retryCampaign } = useCampaign(id);
  const { leads, loading: leadsLoading, refresh: refreshLeads } = useLeads(id);
  const pollingRef = useRef(false);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState("");

  // Atualiza a tela enquanto a campanha está rodando.
  useEffect(() => {
    if (campaign?.status !== "running") return;
    let cancelled = false;
    const poll = async () => {
      if (pollingRef.current) return;
      pollingRef.current = true;

      try {
        await Promise.all([
          refresh({ silent: true }),
          refreshLeads({ silent: true }),
        ]);
      } finally {
        pollingRef.current = false;
      }
    };

    const interval = setInterval(() => {
      if (!cancelled) void poll();
    }, 5000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [campaign?.status, refresh, refreshLeads]);

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!campaign) {
    return <div className="text-center py-20 text-muted-foreground">Campanha não encontrada</div>;
  }

  const handleRetry = async () => {
    setRetrying(true);
    setRetryError("");
    try {
      await retryCampaign();
      await Promise.all([
        refresh({ silent: true }),
        refreshLeads({ silent: true }),
      ]);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Nao foi possivel tentar novamente agora.");
    } finally {
      setRetrying(false);
    }
  };

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/campaigns"><ArrowLeft className="h-4 w-4" /></Link>
        </Button>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="break-words text-xl font-bold lg:truncate">{campaign.name}</h1>
            {campaign.status === "completed" && <Badge variant="success">{campaignStatusLabel.completed}</Badge>}
            {campaign.status === "running" && (
              <Badge variant="info" className="flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />{campaign.progress}%
              </Badge>
            )}
            {campaign.status === "failed" && <Badge variant="destructive">{campaignStatusLabel.failed}</Badge>}
            {campaign.status === "draft" && <Badge variant="secondary">{campaignStatusLabel.draft}</Badge>}
          </div>
          <p className="text-muted-foreground text-sm capitalize">{campaign.industry} - {campaign.location}</p>
        </div>
        </div>
        <div className="grid w-full grid-cols-3 gap-2 lg:w-auto lg:flex lg:items-center">
          <Button variant="outline" size="sm" onClick={() => api.download(`/export/leads/csv?campaignId=${id}`, `leads-${id}.csv`)}>
            <Download className="mr-2 h-4 w-4" />CSV
          </Button>
          <Button variant="outline" size="sm" onClick={() => api.download(`/export/leads/json?campaignId=${id}`, `leads-${id}.json`)}>
            <Download className="mr-2 h-4 w-4" />JSON
          </Button>
          <Button variant="outline" size="sm" onClick={() => api.download(`/export/leads/vcard?campaignId=${id}`, `leads-${id}.vcf`)}>
            <Download className="mr-2 h-4 w-4" />vCard
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
        {[
          { label: "Total de leads", value: campaign.totalLeads, icon: Users, color: "text-blue-500" },
          { label: "Leads prioritários", value: campaign.priorityLeads, icon: Star, color: "text-amber-500" },
          { label: "Alta qualidade", value: campaign.highQualityLeads, icon: TrendingUp, color: "text-emerald-500" },
          { label: "Score médio", value: campaign.averageScore || "-", icon: MapPin, color: "text-purple-500" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-1">
                <s.icon className={`w-4 h-4 ${s.color}`} />
                <span className="text-xs text-muted-foreground">{s.label}</span>
              </div>
              <p className="text-2xl font-bold">{s.value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {campaign.status === "running" && (
        <Card>
          <CardContent className="pt-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="flex items-center gap-1.5 text-muted-foreground">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />Busca de leads em andamento...
              </span>
              <span className="font-medium">{campaign.progress}%</span>
            </div>
            <Progress value={campaign.progress} className="h-2" />
          </CardContent>
        </Card>
      )}

      {campaign.status === "failed" && (
        <Card className="border-amber-200 bg-amber-50">
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-amber-950">A busca falhou, mas a campanha foi preservada.</p>
                <p className="mt-1 text-sm leading-6 text-amber-800">
                  Use os mesmos nicho, regiao, fontes e oferta para tentar novamente sem recriar tudo.
                </p>
                {(campaign.error || retryError) && (
                  <p className="mt-2 break-words text-xs text-amber-700">{retryError || campaign.error}</p>
                )}
              </div>
            </div>
            <Button
              type="button"
              className="w-full rounded-xl bg-purple-600 hover:bg-purple-700 sm:w-auto"
              disabled={retrying}
              onClick={() => void handleRetry()}
            >
              {retrying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCcw className="mr-2 h-4 w-4" />}
              Tentar novamente
            </Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Leads ({leads.length})</CardTitle>
            <Button variant="outline" size="sm" className="text-xs">
              <Search className="mr-1 w-3 h-3" />Filtrar
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <LeadsTable leads={leads} loading={leadsLoading} />
        </CardContent>
      </Card>
    </div>
  );
}
