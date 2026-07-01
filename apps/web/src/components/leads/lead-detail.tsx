"use client";
import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Phone, Globe, MapPin, Star, Mail, MessageCircle, Loader2, Copy, Instagram } from "lucide-react";
import { useLead } from "@/hooks/use-leads";
import { api } from "@/lib/api";
import { crmStatusLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function LeadDetail({ id, isModal = false }: { id: string; isModal?: boolean }) {
  const { lead, loading, refresh } = useLead(id);
  const [crmStatus, setCrmStatus] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleCrmUpdate = async () => {
    if (!crmStatus || !lead) return;
    setSaving(true);
    try {
      await api.patch(`/leads/${id}/crm`, { crmStatus });
      await refresh();
    } catch (e) {
      console.error("Falha ao atualizar CRM:", e);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  if (!lead) {
    return <div className="text-center py-20 text-muted-foreground">Lead não encontrado</div>;
  }

  return (
    <div className={cn("space-y-5 bg-white text-slate-950 sm:space-y-6", isModal ? "px-4 pb-5 pt-5 sm:px-8 sm:pb-8 sm:pt-7" : "mx-auto max-w-6xl")}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
        {!isModal && (
          <Button variant="outline" size="icon" className="mt-1 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-950" asChild>
            <Link href="/leads"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="break-words text-xl font-semibold leading-tight text-slate-950 sm:text-2xl">{lead.name}</h1>
            {lead.priority === "HIGH" && <Badge variant="success">Alta prioridade</Badge>}
            {lead.hasWebsite && <Badge variant="info">Tem site</Badge>}
          </div>
          <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-500">{lead.industry} - {lead.address}</p>
        </div>
        <div className="w-full shrink-0 rounded-2xl border border-purple-200 bg-purple-50 px-5 py-3 text-center shadow-sm shadow-purple-950/[0.04] sm:w-auto">
          <div className="text-2xl font-bold leading-none text-purple-700 sm:text-3xl">{lead.score}</div>
          <div className="mt-1 text-xs font-medium text-slate-500">Score IA</div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-5">
          {lead.aiAnalysis?.catalogOpportunity && (
            <Card className="border-purple-200 bg-purple-50/70 shadow-sm shadow-purple-950/[0.03]">
              <CardHeader className="border-b border-purple-100 px-4 py-4 sm:px-6 sm:py-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <CardTitle className="text-lg text-slate-950">Análise para catálogo online</CardTitle>
                  <Badge variant={lead.aiAnalysis.catalogOpportunity.level === "HIGH" ? "success" : lead.aiAnalysis.catalogOpportunity.level === "MEDIUM" ? "warning" : "secondary"}>
                    {lead.aiAnalysis.catalogOpportunity.level === "HIGH" ? "Alta oportunidade" : lead.aiAnalysis.catalogOpportunity.level === "MEDIUM" ? "Oportunidade média" : "Baixa oportunidade"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 p-4 text-sm sm:p-6">
                <p className="leading-6 text-slate-600">{lead.aiAnalysis.recommendation}</p>
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.02]">
                  <p className="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">Ângulo comercial</p>
                  <p className="leading-6 text-slate-950">{lead.aiAnalysis.catalogOpportunity.offerAngle}</p>
                </div>
                {lead.aiAnalysis.catalogOpportunity.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {lead.aiAnalysis.catalogOpportunity.reasons.map((reason) => (
                      <Badge key={reason} variant="outline" className="border-slate-300 bg-white text-slate-700">{reason}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dados de contato */}
          <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
            <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <CardTitle className="text-lg text-slate-950">Dados de contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              {[
                { icon: Phone, label: "Telefone", value: lead.phone },
                { icon: Globe, label: "Website", value: lead.website },
                { icon: Instagram, label: "Instagram", value: lead.instagramUrl, href: lead.instagramUrl },
                { icon: MapPin, label: "Endereço", value: lead.address },
                { icon: Star, label: "Avaliação", value: lead.rating ? `${lead.rating} estrelas no Google Maps` : undefined },
              ]
                .filter((i) => i.value)
                .map((item) => (
                  <div key={item.label} className="flex items-start gap-3">
                    <item.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-slate-500" />
                    {item.href ? (
                      <a
                        href={item.href}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 break-words text-sm leading-6 text-purple-700 underline-offset-4 hover:underline"
                      >
                        {item.value}
                      </a>
                    ) : (
                      <span className="flex-1 break-words text-sm leading-6 text-slate-950">{item.value}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 flex-shrink-0 rounded-xl text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      onClick={() => navigator.clipboard.writeText(item.value!)}
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
            </CardContent>
          </Card>

          {/* Conteúdo comercial por IA */}
          {lead.marketingContent && (
            <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
              <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
                <CardTitle className="text-lg text-slate-950">Abordagem gerada por IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-5 p-4 sm:p-6">
                {lead.marketingContent.email && (
                  <div>
                    <div className="mb-2 flex items-center gap-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-semibold text-slate-950">Email</span>
                      <Button variant="ghost" size="sm" className="ml-auto h-7 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-950" onClick={() => navigator.clipboard.writeText(lead.marketingContent!.email!.body)}>
                        Copiar
                      </Button>
                    </div>
                    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                      <p className="mb-2 font-semibold text-slate-500">Assunto: {lead.marketingContent.email.subject}</p>
                      <p className="whitespace-pre-wrap">{lead.marketingContent.email.body}</p>
                    </div>
                  </div>
                )}
                {lead.marketingContent.whatsapp && (
                  <>
                    <Separator />
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-semibold text-slate-950">WhatsApp</span>
                        <Button variant="ghost" size="sm" className="ml-auto h-7 rounded-lg text-xs text-slate-500 hover:bg-slate-100 hover:text-slate-950" onClick={() => navigator.clipboard.writeText(lead.marketingContent!.whatsapp!)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="whitespace-pre-wrap rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                        {lead.marketingContent.whatsapp}
                      </div>
                    </div>
                  </>
                )}
                {lead.marketingContent.instagram && (
                  <>
                    <Separator />
                    <div>
                      <div className="mb-2 flex items-center gap-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span className="text-sm font-semibold text-slate-950">Mensagem no Instagram</span>
                      </div>
                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-relaxed text-slate-700">
                        {lead.marketingContent.instagram}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Painel CRM */}
        <div className="space-y-5">
          <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
            <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <CardTitle className="text-lg text-slate-950">Status no CRM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <Select
                defaultValue={lead.crmStatus}
                onValueChange={(v) => setCrmStatus(v)}
              >
                <SelectTrigger className="h-12 rounded-xl border-slate-200 bg-white text-slate-950 focus:ring-purple-500">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{crmStatusLabel.new}</SelectItem>
                  <SelectItem value="potential_customer">{crmStatusLabel.potential_customer}</SelectItem>
                  <SelectItem value="contacted">{crmStatusLabel.contacted}</SelectItem>
                  <SelectItem value="qualified">{crmStatusLabel.qualified}</SelectItem>
                  <SelectItem value="proposal">{crmStatusLabel.proposal}</SelectItem>
                  <SelectItem value="negotiation">{crmStatusLabel.negotiation}</SelectItem>
                  <SelectItem value="won">{crmStatusLabel.won}</SelectItem>
                  <SelectItem value="not_interested">{crmStatusLabel.not_interested}</SelectItem>
                  <SelectItem value="lost">{crmStatusLabel.lost}</SelectItem>
                  <SelectItem value="archived">{crmStatusLabel.archived}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="h-12 w-full rounded-xl bg-purple-700 text-sm font-semibold text-white shadow-lg shadow-purple-700/20 hover:bg-purple-800"
                onClick={handleCrmUpdate}
                disabled={saving || !crmStatus}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar status"}
              </Button>
            </CardContent>
          </Card>

          <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
            <CardHeader className="border-b border-slate-100 px-4 py-4 sm:px-6 sm:py-5">
              <CardTitle className="text-lg text-slate-950">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent className="p-4 sm:p-6">
              <div className="space-y-3">
                {(lead.activities || []).map((a) => (
                  <div key={a.id} className="border-l-2 border-purple-300 pl-3 text-xs">
                    <p className="font-semibold capitalize text-slate-500">{a.type}</p>
                    <p className="mt-1 leading-5 text-slate-700">{a.note}</p>
                  </div>
                ))}
                {(!lead.activities || lead.activities.length === 0) && (
                  <p className="py-4 text-center text-sm text-slate-500">Nenhuma atividade ainda</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
