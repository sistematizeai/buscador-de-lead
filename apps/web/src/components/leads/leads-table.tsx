"use client";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Phone, Globe, MapPin, Star, ChevronRight, Loader2, Users } from "lucide-react";
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
          className="flex cursor-pointer items-center gap-4 px-6 py-4 transition-colors hover:bg-slate-50"
          onClick={handleRowClick(lead.id)}
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 shadow-sm shadow-blue-500/20">
            <span className="text-white font-bold text-sm">{lead.name.charAt(0)}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5 flex-wrap">
              <span className="truncate text-sm font-semibold text-slate-950">{lead.name}</span>
              <PriorityBadge priority={lead.priority} />
              <CrmBadge status={lead.crmStatus} />
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
              {lead.address && (
                <span className="flex items-center gap-1 truncate max-w-[200px]">
                  <MapPin className="w-3 h-3 flex-shrink-0" />{lead.address}
                </span>
              )}
              {lead.phone && <span className="flex items-center gap-1"><Phone className="w-3 h-3" />{lead.phone}</span>}
              {lead.website && <span className="flex items-center gap-1"><Globe className="w-3 h-3" />{lead.website}</span>}
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {lead.rating && (
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Star className="w-3 h-3 text-amber-500" />{lead.rating}
              </span>
            )}
            <div className="text-right hidden sm:block">
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
        <DialogContent className="max-h-[90vh] overflow-y-auto max-w-4xl border border-zinc-800 bg-zinc-950/95 backdrop-blur-md">
          {selectedLeadId && <LeadDetail id={selectedLeadId} isModal />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
