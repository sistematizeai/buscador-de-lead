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
    <div className={cn("space-y-6", !isModal && "max-w-4xl")}>
      <div className="flex items-center gap-3">
        {!isModal && (
          <Button variant="ghost" size="icon" asChild>
            <Link href="/leads"><ArrowLeft className="h-4 w-4" /></Link>
          </Button>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold">{lead.name}</h1>
            {lead.priority === "HIGH" && <Badge variant="success">Alta prioridade</Badge>}
            {lead.hasWebsite && <Badge variant="info">Tem site</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">{lead.industry} - {lead.address}</p>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="text-2xl font-bold text-purple-600">{lead.score}</div>
          <div className="text-xs text-muted-foreground">Score IA</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 space-y-4">
          {lead.aiAnalysis?.catalogOpportunity && (
            <Card className="border-purple-500/30 bg-purple-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-3">
                  <CardTitle className="text-base">Análise para catálogo online</CardTitle>
                  <Badge variant={lead.aiAnalysis.catalogOpportunity.level === "HIGH" ? "success" : lead.aiAnalysis.catalogOpportunity.level === "MEDIUM" ? "warning" : "secondary"}>
                    {lead.aiAnalysis.catalogOpportunity.level === "HIGH" ? "Alta oportunidade" : lead.aiAnalysis.catalogOpportunity.level === "MEDIUM" ? "Oportunidade média" : "Baixa oportunidade"}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <p className="text-muted-foreground">{lead.aiAnalysis.recommendation}</p>
                <div className="rounded-lg bg-background/70 p-3">
                  <p className="mb-1 text-xs font-medium uppercase text-muted-foreground">Ângulo comercial</p>
                  <p>{lead.aiAnalysis.catalogOpportunity.offerAngle}</p>
                </div>
                {lead.aiAnalysis.catalogOpportunity.reasons.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {lead.aiAnalysis.catalogOpportunity.reasons.map((reason) => (
                      <Badge key={reason} variant="outline">{reason}</Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Dados de contato */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Dados de contato</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { icon: Phone, label: "Telefone", value: lead.phone },
                { icon: Globe, label: "Website", value: lead.website },
                { icon: MapPin, label: "Endereço", value: lead.address },
                { icon: Star, label: "Avaliação", value: lead.rating ? `${lead.rating} estrelas no Google Maps` : undefined },
              ]
                .filter((i) => i.value)
                .map((item) => (
                  <div key={item.label} className="flex items-center gap-3">
                    <item.icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                    <span className="text-sm flex-1 break-all">{item.value}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-40 hover:opacity-100 flex-shrink-0"
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
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Abordagem gerada por IA</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {lead.marketingContent.email && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Mail className="w-4 h-4 text-blue-500" />
                      <span className="text-sm font-medium">Email</span>
                      <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs opacity-60 hover:opacity-100" onClick={() => navigator.clipboard.writeText(lead.marketingContent!.email!.body)}>
                        Copiar
                      </Button>
                    </div>
                    <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed">
                      <p className="font-medium text-muted-foreground mb-1.5">Assunto: {lead.marketingContent.email.subject}</p>
                      <p className="whitespace-pre-wrap">{lead.marketingContent.email.body}</p>
                    </div>
                  </div>
                )}
                {lead.marketingContent.whatsapp && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <MessageCircle className="w-4 h-4 text-emerald-500" />
                        <span className="text-sm font-medium">WhatsApp</span>
                        <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs opacity-60 hover:opacity-100" onClick={() => navigator.clipboard.writeText(lead.marketingContent!.whatsapp!)}>
                          Copiar
                        </Button>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed whitespace-pre-wrap">
                        {lead.marketingContent.whatsapp}
                      </div>
                    </div>
                  </>
                )}
                {lead.marketingContent.instagram && (
                  <>
                    <Separator />
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Instagram className="w-4 h-4 text-pink-500" />
                        <span className="text-sm font-medium">Mensagem no Instagram</span>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3 text-xs leading-relaxed">
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
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Status no CRM</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Select
                defaultValue={lead.crmStatus}
                onValueChange={(v) => setCrmStatus(v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new">{crmStatusLabel.new}</SelectItem>
                  <SelectItem value="contacted">{crmStatusLabel.contacted}</SelectItem>
                  <SelectItem value="replied">{crmStatusLabel.replied}</SelectItem>
                  <SelectItem value="meeting">{crmStatusLabel.meeting}</SelectItem>
                  <SelectItem value="proposal">{crmStatusLabel.proposal}</SelectItem>
                  <SelectItem value="won">{crmStatusLabel.won}</SelectItem>
                  <SelectItem value="lost">{crmStatusLabel.lost}</SelectItem>
                  <SelectItem value="contact_later">{crmStatusLabel.contact_later}</SelectItem>
                </SelectContent>
              </Select>
              <Button
                className="w-full bg-purple-600 hover:bg-purple-700 text-sm h-9"
                onClick={handleCrmUpdate}
                disabled={saving || !crmStatus}
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Atualizar status"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Histórico de atividades</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {(lead.activities || []).map((a) => (
                  <div key={a.id} className="text-xs border-l-2 border-purple-500/30 pl-3">
                    <p className="font-medium capitalize text-muted-foreground">{a.type}</p>
                    <p className="mt-0.5">{a.note}</p>
                  </div>
                ))}
                {(!lead.activities || lead.activities.length === 0) && (
                  <p className="text-sm text-muted-foreground text-center py-4">Nenhuma atividade ainda</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
