"use client";

import type React from "react";
import { useMemo, useState } from "react";
import { AlertCircle, Building2, CheckCircle2, Database, Loader2, Plus, Search } from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface CompanySearchForm {
  companyName: string;
  legalName: string;
  tradeName: string;
  cnpj: string;
  city: string;
  state: string;
  zipCode: string;
  district: string;
  street: string;
  segment: string;
  cnae: string;
}

interface CompanySearchResult {
  id: string;
  companyName: string;
  tradeName?: string | null;
  cnpj?: string | null;
  businessStatus?: string | null;
  openedAt?: string | null;
  legalNature?: string | null;
  cnae?: string | null;
  cnaeDescription?: string | null;
  industry?: string | null;
  size?: string | null;
  address?: string | null;
  zipCode?: string | null;
  city?: string | null;
  state?: string | null;
  district?: string | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  source: string;
  sourceReference?: string | null;
  searchedAt: string;
}

interface CompanySearchResponse {
  mode: string;
  savedAutomatically: boolean;
  searchId: string;
  results: CompanySearchResult[];
  message: string;
}

const emptyForm: CompanySearchForm = {
  companyName: "",
  legalName: "",
  tradeName: "",
  cnpj: "",
  city: "",
  state: "",
  zipCode: "",
  district: "",
  street: "",
  segment: "",
  cnae: "",
};

export function CompanySearchPage() {
  const [form, setForm] = useState<CompanySearchForm>(emptyForm);
  const [results, setResults] = useState<CompanySearchResult[]>([]);
  const [selected, setSelected] = useState<CompanySearchResult | null>(null);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const filledFields = useMemo(
    () => Object.values(form).filter((value) => value.trim()).length,
    [form],
  );

  const update = (key: keyof CompanySearchForm, value: string) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSearch = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setMessage("");
    setResults([]);
    setSelected(null);

    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value.trim()).map(([key, value]) => [key, value.trim()]),
      );
      const response = await api.post<CompanySearchResponse>("/company-search", payload);
      setResults(response.results);
      setSelected(response.results[0] ?? null);
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível localizar a empresa agora.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post<{ message: string; duplicate: boolean }>("/company-search/save-to-crm", {
        companyName: selected.companyName,
        tradeName: selected.tradeName,
        cnpj: selected.cnpj,
        businessStatus: selected.businessStatus,
        industry: selected.industry || selected.cnaeDescription,
        cnae: selected.cnae,
        address: selected.address,
        zipCode: selected.zipCode,
        phone: selected.phone,
        email: selected.email,
        website: selected.website,
        notes,
        tags: ["Busca de Empresa"],
        searchProvider: selected.source,
        sourceReference: selected.sourceReference,
      });
      setMessage(response.message);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível adicionar ao CRM agora.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 pb-8">
      <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-medium text-purple-700">Pesquisa Individual</p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950">Localizar Empresa</h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Busque uma empresa por CNPJ, nome ou endereço sem criar campanha e sem salvar automaticamente no CRM.
            </p>
          </div>
          <div className="rounded-2xl border border-purple-100 bg-purple-50 px-4 py-3 text-sm text-purple-900">
            {filledFields} campos preenchidos
          </div>
        </div>
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(420px,0.95fr)]">
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Search className="h-5 w-5 text-purple-600" />
              Dados da busca
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <form onSubmit={handleSearch} className="space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="CNPJ">
                  <Input value={form.cnpj} onChange={(e) => update("cnpj", e.target.value)} placeholder="00.000.000/0000-00" />
                </Field>
                <Field label="Nome da empresa">
                  <Input value={form.companyName} onChange={(e) => update("companyName", e.target.value)} placeholder="Ex: Barris Store" />
                </Field>
                <Field label="Razão social">
                  <Input value={form.legalName} onChange={(e) => update("legalName", e.target.value)} placeholder="Razão social" />
                </Field>
                <Field label="Nome fantasia">
                  <Input value={form.tradeName} onChange={(e) => update("tradeName", e.target.value)} placeholder="Nome fantasia" />
                </Field>
                <Field label="Cidade">
                  <Input value={form.city} onChange={(e) => update("city", e.target.value)} placeholder="Salvador" />
                </Field>
                <Field label="Estado">
                  <Input value={form.state} onChange={(e) => update("state", e.target.value.toUpperCase())} placeholder="BA" maxLength={2} />
                </Field>
                <Field label="CEP">
                  <Input value={form.zipCode} onChange={(e) => update("zipCode", e.target.value)} placeholder="40000-000" />
                </Field>
                <Field label="Bairro">
                  <Input value={form.district} onChange={(e) => update("district", e.target.value)} placeholder="Barris" />
                </Field>
                <Field label="Rua ou endereço">
                  <Input value={form.street} onChange={(e) => update("street", e.target.value)} placeholder="Rua Conselheiro..." />
                </Field>
                <Field label="Segmento">
                  <Input value={form.segment} onChange={(e) => update("segment", e.target.value)} placeholder="Petshop, restaurante..." />
                </Field>
              </div>

              <div className="flex flex-col gap-3 border-t border-slate-100 pt-5 sm:flex-row sm:justify-end">
                <Button type="button" variant="outline" onClick={() => setForm(emptyForm)} className="rounded-xl">
                  Limpar
                </Button>
                <Button type="submit" disabled={loading || filledFields === 0} className="rounded-xl bg-purple-600 hover:bg-purple-700">
                  {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                  Localizar empresa
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          {(message || error) && (
            <div className={`flex gap-2 rounded-2xl border px-4 py-3 text-sm ${
              error ? "border-red-200 bg-red-50 text-red-800" : "border-emerald-200 bg-emerald-50 text-emerald-800"
            }`}>
              {error ? <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> : <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />}
              <span>{error || message}</span>
            </div>
          )}

          <Card className="rounded-3xl border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Database className="h-5 w-5 text-purple-600" />
                Resultado
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 p-6">
              {!selected ? (
                <div className="rounded-3xl border border-dashed border-slate-200 p-8 text-center">
                  <Building2 className="mx-auto h-10 w-10 text-slate-300" />
                  <p className="mt-4 font-medium text-slate-950">Nenhuma empresa selecionada</p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Os dados encontrados aparecerão aqui para revisão antes de entrar no CRM.
                  </p>
                </div>
              ) : (
                <>
                  <div className="rounded-3xl border border-purple-100 bg-purple-50 p-5">
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-purple-700">{selected.source}</p>
                    <h2 className="mt-2 text-xl font-bold text-slate-950">{selected.tradeName || selected.companyName}</h2>
                    <p className="mt-1 text-sm text-slate-600">{selected.companyName}</p>
                  </div>

                  <dl className="grid gap-3 text-sm sm:grid-cols-2">
                    <Info label="CNPJ" value={selected.cnpj} />
                    <Info label="Situação" value={selected.businessStatus} />
                    <Info label="CNAE" value={selected.cnaeDescription || selected.cnae} />
                    <Info label="Porte" value={selected.size} />
                    <Info label="Telefone" value={selected.phone} />
                    <Info label="E-mail" value={selected.email} />
                    <Info label="Site" value={selected.website} />
                    <Info label="Cidade/UF" value={[selected.city, selected.state].filter(Boolean).join(" / ")} />
                  </dl>
                  <Info label="Endereço" value={selected.address} wide />

                  {results.length > 1 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Outros resultados</p>
                      {results.map((result) => (
                        <button
                          key={result.id}
                          type="button"
                          onClick={() => setSelected(result)}
                          className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-left text-sm hover:border-purple-200 hover:bg-purple-50"
                        >
                          <span className="font-medium text-slate-950">{result.tradeName || result.companyName}</span>
                          <span className="block text-xs text-slate-500">{result.address || result.cnpj || result.source}</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="notes">Observações antes de salvar</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Ex: potencial para catálogo online, validar WhatsApp antes do contato..."
                      className="min-h-24 rounded-2xl"
                    />
                  </div>

                  <Button onClick={handleSave} disabled={saving} className="w-full rounded-xl bg-purple-600 hover:bg-purple-700">
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                    Adicionar ao CRM como Potencial Cliente
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-800">{label}</Label>
      {children}
    </div>
  );
}

function Info({ label, value, wide }: { label: string; value?: string | null; wide?: boolean }) {
  return (
    <div className={wide ? "rounded-2xl border border-slate-100 bg-slate-50 p-4 text-sm" : "rounded-2xl border border-slate-100 bg-slate-50 p-4"}>
      <dt className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">{label}</dt>
      <dd className="mt-1 break-words text-sm text-slate-950">{value || "Não informado"}</dd>
    </div>
  );
}
