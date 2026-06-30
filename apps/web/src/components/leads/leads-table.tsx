"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Globe, MapPin, Star, ChevronRight, Loader2, Users, Instagram } from "lucide-react";
import type { Lead } from "@/hooks/use-leads";
import { crmStatusLabel, priorityLabel } from "@/lib/labels";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { LeadDetail } from "./lead-detail";
import { PremiumEmptyState } from "@/components/ui/premium-empty-state";

function PriorityBadge({ priority }: { priority: Lead["priority"] }) {
  if (priority === "HIGH") return <Badge variant="success">{priorityLabel.HIGH}</Badge>;
  if (priority === "MEDIUM") return <Badge variant="warning">{priorityLabel.MEDIUM}</Badge>;
  return <Badge variant="secondary">{priorityLabel.LOW}</Badge>;
}

function CrmBadge({ status }: { status: Lead["crmStatus"] }) {
  const map: Record<Lead["crmStatus"], "secondary" | "info" | "warning" | "success" | "destructive"> = {
    new: "secondary",
    contacted: "info",
    replied: "info",
    meeting: "warning",
    proposal: "warning",
    won: "success",
    lost: "destructive",
    contact_later: "info",
  };
  return <Badge variant={map[status]}>{crmStatusLabel[status] ?? status}</Badge>;
}

interface Props {
  leads: Lead[];
  loading: boolean;
}

export function LeadsTable({ leads, loading }: Props) {
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (leads.length === 0) {
    return (
      <div className="p-4">
        <PremiumEmptyState
          icon={Users}
          title="Os leads aparecerão aqui após a coleta"
          description="Crie uma campanha com nicho e região. Assim que o motor buscar empresas no Google Maps, você verá os contatos, score e status comercial nesta área."
        />
      </div>
    );
  }

  const handleRowClick = (leadId: string) => (e: React.MouseEvent) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a")) return;
    setSelectedLeadId(leadId);
  };

  return (
    <div className="divide-y divide-slate-100">
      {leads.map((lead) => (
        <div
          key={lead.id}
          className="flex cursor-pointer flex-col gap-3 px-4 py-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:gap-4 sm:px-6"
          onClick={handleRowClick(lead.id)}
        >
          <div className="flex w-full min-w-0 gap-3 sm:flex-1 sm:gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm shadow-blue-500/20">
              <span className="text-sm font-bold text-white">{lead.name.charAt(0)}</span>
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-1 flex flex-wrap items-center gap-2">
                <span className="min-w-0 break-words text-sm font-semibold text-slate-950 sm:truncate">{lead.name}</span>
                <PriorityBadge priority={lead.priority} />
                <CrmBadge status={lead.crmStatus} />
              </div>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                {lead.address && (
                  <span className="flex min-w-0 items-center gap-1 break-words sm:max-w-[240px] sm:truncate">
                    <MapPin className="h-3 w-3 flex-shrink-0" />{lead.address}
                  </span>
                )}
                {lead.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</span>}
                {lead.website && <span className="flex min-w-0 items-center gap-1 break-all"><Globe className="h-3 w-3" />{lead.website}</span>}
                {lead.instagramUrl && <span className="flex items-center gap-1 text-pink-600"><Instagram className="h-3 w-3" />Instagram</span>}
              </div>
            </div>
          </div>
          <div className="flex w-full flex-shrink-0 items-center justify-between gap-3 pl-[3.25rem] sm:w-auto sm:justify-end sm:pl-0">
            {lead.rating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="h-3 w-3 text-amber-500" />{lead.rating}
              </span>
            )}
            <div className="text-right">
              <div className="text-sm font-bold text-purple-600">{lead.score}</div>
              <div className="text-[10px] text-muted-foreground">Score</div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-xl"
              onClick={() => setSelectedLeadId(lead.id)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <Dialog open={!!selectedLeadId} onOpenChange={(open) => !open && setSelectedLeadId(null)}>
        <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto border-slate-200 bg-white p-0 text-slate-950 shadow-2xl shadow-slate-950/25 sm:w-full">
          {selectedLeadId && <LeadDetail id={selectedLeadId} isModal />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
