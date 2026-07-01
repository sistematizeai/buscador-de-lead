"use client";

import { useState } from "react";
import { Download, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useLeads } from "@/hooks/use-leads";
import { api } from "@/lib/api";
import { LeadsTable } from "./leads-table";

export function LeadsList() {
  const { leads, loading } = useLeads();
  const [search, setSearch] = useState("");
  const [priority, setPriority] = useState("all");
  const [crmStatus, setCrmStatus] = useState("all");

  const filtered = leads.filter((lead) => {
    const matchSearch =
      !search ||
      lead.name.toLowerCase().includes(search.toLowerCase()) ||
      (lead.tradeName || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.cnpj || "").includes(search.replace(/\D/g, "")) ||
      (lead.address || "").toLowerCase().includes(search.toLowerCase()) ||
      (lead.phone || "").toLowerCase().includes(search.toLowerCase());
    const matchPriority = priority === "all" || lead.priority === priority;
    const matchCrm = crmStatus === "all" || lead.crmStatus === crmStatus;
    return matchSearch && matchPriority && matchCrm;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm shadow-slate-950/[0.03] sm:p-4 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar por empresa, CNPJ, endereço ou telefone..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 focus-visible:bg-white"
          />
        </div>
        <Select value={priority} onValueChange={setPriority}>
          <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white lg:w-40"><SelectValue placeholder="Prioridade" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas</SelectItem>
            <SelectItem value="HIGH">Alta</SelectItem>
            <SelectItem value="MEDIUM">Média</SelectItem>
            <SelectItem value="LOW">Baixa</SelectItem>
          </SelectContent>
        </Select>
        <Select value={crmStatus} onValueChange={setCrmStatus}>
          <SelectTrigger className="h-11 w-full rounded-xl border-slate-200 bg-white lg:w-52"><SelectValue placeholder="Status CRM" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="new">Novo</SelectItem>
            <SelectItem value="potential_customer">Potencial Cliente</SelectItem>
            <SelectItem value="contacted">Em Contato</SelectItem>
            <SelectItem value="qualified">Qualificado</SelectItem>
            <SelectItem value="proposal">Proposta Enviada</SelectItem>
            <SelectItem value="negotiation">Negociação</SelectItem>
            <SelectItem value="won">Cliente</SelectItem>
            <SelectItem value="not_interested">Sem Interesse</SelectItem>
            <SelectItem value="lost">Perdido</SelectItem>
            <SelectItem value="archived">Arquivado</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" className="h-11 w-full rounded-xl bg-white lg:ml-auto lg:w-auto" onClick={() => api.download("/export/leads/csv", "leads-all.csv")}>
          <Download className="mr-2 h-4 w-4" />Exportar CSV
        </Button>
      </div>

      <Card className="overflow-hidden border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
        <CardContent className="p-0">
          <LeadsTable leads={filtered} loading={loading} />
        </CardContent>
      </Card>
    </div>
  );
}
