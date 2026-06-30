"use client";

import { useState } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useCampaigns, type Campaign } from "@/hooks/use-campaigns";
import { campaignStatusLabel } from "@/lib/labels";
import { formatDate } from "@/lib/utils";
import {
  ChevronRight,
  AlertTriangle,
  Loader2,
  MapPin,
  Megaphone,
  Plus,
  Search,
  Star,
  RotateCcw,
  Trash2,
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
  const { campaigns, loading, deleteCampaign, retryCampaign } = useCampaigns();
  const [search, setSearch] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [campaignToDelete, setCampaignToDelete] = useState<Campaign | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [retryError, setRetryError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);

  const filtered = campaigns.filter(
    (campaign) =>
      campaign.name.toLowerCase().includes(search.toLowerCase()) ||
      campaign.industry.toLowerCase().includes(search.toLowerCase()) ||
      campaign.location.toLowerCase().includes(search.toLowerCase()),
    );

  const handleDeleteCampaign = async () => {
    if (!campaignToDelete) return;
    try {
      setDeleting(true);
      setDeleteError(null);
      await deleteCampaign(campaignToDelete.id);
      setDeleteDialogOpen(false);
      setCampaignToDelete(null);
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : "Nao foi possivel excluir a campanha.");
    } finally {
      setDeleting(false);
    }
  };

  const handleRetryCampaign = async (campaign: Campaign) => {
    try {
      setRetryingId(campaign.id);
      setRetryError(null);
      await retryCampaign(campaign.id);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : "Nao foi possivel tentar novamente agora.");
    } finally {
      setRetryingId(null);
    }
  };

  return (
    <>
      <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/[0.03] sm:flex-row sm:items-center sm:p-4">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar campanhas por nome, nicho ou região..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm focus-visible:bg-white"
          />
        </div>
        <Button asChild className="h-11 w-full rounded-xl bg-purple-600 px-5 shadow-sm shadow-purple-500/20 hover:bg-purple-700 sm:ml-auto sm:w-auto">
          <Link href="/campaigns/new"><Plus className="mr-2 h-4 w-4" />Nova campanha</Link>
        </Button>
      </div>

      {retryError && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {retryError}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((campaign) => (
            <Card key={campaign.id} className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] transition-all hover:border-purple-200 hover:shadow-md">
              <CardContent className="p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
                  <div className="flex min-w-0 flex-1 gap-3 sm:gap-4">
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
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-center sm:flex sm:items-center sm:gap-4">
                    <div className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:px-0 sm:py-0">
                      <div className="flex items-center justify-center gap-1"><Users className="h-3 w-3 text-muted-foreground" /><span className="text-sm font-semibold">{campaign.totalLeads}</span></div>
                      <p className="text-xs text-muted-foreground">Leads</p>
                    </div>
                    <div className="rounded-xl bg-slate-50 px-3 py-2 sm:bg-transparent sm:px-0 sm:py-0">
                      <div className="flex items-center justify-center gap-1"><Star className="h-3 w-3 text-amber-500" /><span className="text-sm font-semibold">{campaign.priorityLeads}</span></div>
                      <p className="text-xs text-muted-foreground">Prioridade</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1 sm:shrink-0">
                    {campaign.status === "failed" && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 rounded-xl border-purple-200 px-2 text-xs text-purple-700 hover:bg-purple-50"
                        disabled={retryingId === campaign.id}
                        onClick={() => void handleRetryCampaign(campaign)}
                      >
                        {retryingId === campaign.id ? (
                          <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <RotateCcw className="mr-1 h-3.5 w-3.5" />
                        )}
                        Tentar novamente
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-xl text-slate-500 hover:bg-red-50 hover:text-red-600"
                      aria-label={`Excluir campanha ${campaign.name}`}
                      onClick={() => {
                        setDeleteError(null);
                        setCampaignToDelete(campaign);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
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

      {campaignToDelete && (
        <Dialog open={deleteDialogOpen} onOpenChange={(open) => {
          setDeleteDialogOpen(open);
          if (!open && !deleting) {
            setCampaignToDelete(null);
            setDeleteError(null);
          }
        }}>
          <DialogContent className="max-w-lg border-slate-200 bg-white p-0 text-slate-950 shadow-2xl shadow-slate-950/20">
            <DialogHeader className="border-b border-slate-100 px-6 pb-4 pt-6 text-left">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <DialogTitle className="text-xl font-semibold text-slate-950">Excluir campanha</DialogTitle>
              <DialogDescription className="text-sm leading-6 text-slate-600">
                Esta acao remove a campanha e todos os leads vinculados a ela. Depois de confirmar, a exclusao nao pode ser desfeita.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 px-6 py-4">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-semibold text-slate-950">{campaignToDelete.name}</p>
                <p className="mt-1 text-sm text-slate-600">{campaignToDelete.industry} - {campaignToDelete.location}</p>
                <p className="mt-2 text-xs text-slate-500">
                  Leads nesta campanha: <span className="font-semibold text-slate-700">{campaignToDelete.totalLeads}</span>
                </p>
              </div>

              {campaignToDelete.status === "running" && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                  Esta campanha esta em andamento. Excluir agora tambem remove os leads ja coletados.
                </div>
              )}

              {deleteError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {deleteError}
                </div>
              )}
            </div>

            <DialogFooter className="border-t border-slate-100 px-6 py-4 sm:space-x-3">
              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                disabled={deleting}
                onClick={() => {
                  setDeleteDialogOpen(false);
                  setCampaignToDelete(null);
                  setDeleteError(null);
                }}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                variant="destructive"
                className="h-11 rounded-xl"
                disabled={deleting}
                onClick={handleDeleteCampaign}
              >
                {deleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Excluir campanha
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
