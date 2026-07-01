"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { buildCampaignSearchQueries, buildRegionLabel, type CampaignRegionConfig } from "@/lib/campaign-planner";
import {
  Building2,
  Check,
  Home,
  Loader2,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
  Wand2,
  X,
  Instagram,
  Store,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

type SearchSource = "google_maps" | "instagram" | "facebook_marketplace";

type CampaignFormState = {
  name: string;
  industry: string;
  location: string;
  yourService: string;
  maxResults: string;
  contentStyle: string;
  language: string;
  targetWebsiteMode: "any" | "missing_website";
  sources: SearchSource[];
};

type StringFormField = Exclude<keyof CampaignFormState, "sources" | "targetWebsiteMode">;

const SEARCH_SOURCE_OPTIONS: Array<{
  value: SearchSource;
  label: string;
  description: string;
  engine: string;
  icon: LucideIcon;
  activeClass: string;
  iconClass: string;
}> = [
  {
    value: "google_maps",
    label: "Google Maps",
    description: "Empresas locais com telefone, endereço e site.",
    engine: "Motor principal Gosom",
    icon: MapPin,
    activeClass: "border-purple-500 bg-purple-50 text-purple-950 ring-1 ring-purple-500",
    iconClass: "bg-purple-100 text-purple-700",
  },
  {
    value: "instagram",
    label: "Instagram",
    description: "Perfis comerciais encontrados por dork no DuckDuckGo.",
    engine: "IA extrai contatos da bio",
    icon: Instagram,
    activeClass: "border-pink-500 bg-pink-50 text-pink-950 ring-1 ring-pink-500",
    iconClass: "bg-pink-100 text-pink-700",
  },
  {
    value: "facebook_marketplace",
    label: "Marketplace",
    description: "Anúncios locais com texto analisado pela IA.",
    engine: "IA qualifica descrições",
    icon: Store,
    activeClass: "border-blue-500 bg-blue-50 text-blue-950 ring-1 ring-blue-500",
    iconClass: "bg-blue-100 text-blue-700",
  },
];

const INDUSTRIES = [
  { value: "restaurant", label: "Restaurantes e alimentação" },
  { value: "cafe", label: "Cafés e cafeterias" },
  { value: "retail", label: "Varejo e moda" },
  { value: "automotive", label: "Automotivo" },
  { value: "healthcare", label: "Saúde e clínicas" },
  { value: "beauty", label: "Beleza e bem-estar" },
  { value: "petshop", label: "Pet shops e banho e tosa" },
  { value: "education", label: "Educação e cursos" },
  { value: "realestate", label: "Imobiliário" },
  { value: "event", label: "Eventos e casamentos" },
  { value: "tech", label: "Tecnologia" },
  { value: "professional", label: "Serviços profissionais" },
];

const BRAZIL_STATES = [
  { name: "Acre", uf: "AC" }, { name: "Alagoas", uf: "AL" }, { name: "Amapá", uf: "AP" },
  { name: "Amazonas", uf: "AM" }, { name: "Bahia", uf: "BA" }, { name: "Ceará", uf: "CE" },
  { name: "Distrito Federal", uf: "DF" }, { name: "Espírito Santo", uf: "ES" }, { name: "Goiás", uf: "GO" },
  { name: "Maranhão", uf: "MA" }, { name: "Mato Grosso", uf: "MT" }, { name: "Mato Grosso do Sul", uf: "MS" },
  { name: "Minas Gerais", uf: "MG" }, { name: "Pará", uf: "PA" }, { name: "Paraíba", uf: "PB" },
  { name: "Paraná", uf: "PR" }, { name: "Pernambuco", uf: "PE" }, { name: "Piauí", uf: "PI" },
  { name: "Rio de Janeiro", uf: "RJ" }, { name: "Rio Grande do Norte", uf: "RN" },
  { name: "Rio Grande do Sul", uf: "RS" }, { name: "Rondônia", uf: "RO" }, { name: "Roraima", uf: "RR" },
  { name: "Santa Catarina", uf: "SC" }, { name: "São Paulo", uf: "SP" }, { name: "Sergipe", uf: "SE" },
  { name: "Tocantins", uf: "TO" },
];

const CITY_SUGGESTIONS: Record<string, string[]> = {
  Bahia: ["Salvador", "Feira de Santana", "Vitória da Conquista", "Camaçari", "Itabuna", "Juazeiro", "Lauro de Freitas"],
  "São Paulo": ["São Paulo", "Campinas", "Santos", "Guarulhos", "Osasco", "São Bernardo do Campo", "Ribeirão Preto"],
  "Rio de Janeiro": ["Rio de Janeiro", "Niterói", "Duque de Caxias", "Nova Iguaçu", "Petrópolis", "Cabo Frio"],
  "Minas Gerais": ["Belo Horizonte", "Uberlândia", "Contagem", "Juiz de Fora", "Betim", "Montes Claros"],
  Paraná: ["Curitiba", "Londrina", "Maringá", "Ponta Grossa", "Cascavel", "Foz do Iguaçu"],
  Pernambuco: ["Recife", "Olinda", "Jaboatão dos Guararapes", "Caruaru", "Petrolina"],
  Ceará: ["Fortaleza", "Caucaia", "Juazeiro do Norte", "Sobral", "Maracanaú"],
};

interface IbgeState {
  id: number;
  sigla: string;
  nome: string;
}

interface IbgeCity {
  id: number;
  nome: string;
}

interface ViaCepResponse {
  erro?: boolean;
  uf?: string;
  localidade?: string;
  bairro?: string;
  logradouro?: string;
}

export function CreateCampaignForm() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [loadingCep, setLoadingCep] = useState(false);
  const [regionError, setRegionError] = useState("");
  const [regionOpen, setRegionOpen] = useState(false);
  const [extraQueries, setExtraQueries] = useState<string[]>([""]);
  const [cep, setCep] = useState("");
  const [ibgeStates, setIbgeStates] = useState<IbgeState[]>([]);
  const [ibgeCities, setIbgeCities] = useState<IbgeCity[]>([]);
  const [region, setRegion] = useState<CampaignRegionConfig>({
    country: "Brasil",
    state: "",
    city: "",
    district: "",
    street: "",
  });
  const [form, setForm] = useState<CampaignFormState>({
    name: "",
    industry: "",
    location: "",
    yourService: "",
    maxResults: "20",
    contentStyle: "balanced",
    language: "portuguese",
    targetWebsiteMode: "missing_website",
    sources: ["google_maps"],
  });

  const set = (key: StringFormField) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((previous) => ({ ...previous, [key]: event.target.value }));

  const selectedIndustry = INDUSTRIES.find((industry) => industry.value === form.industry);
  const industrySearchTerm = selectedIndustry?.label ?? form.industry;
  const preciseLocation = buildRegionLabel(region);
  const hasDetailedRegion = Boolean(region.state || region.city || region.district || region.street || form.location);
  const effectiveLocation = form.location || (hasDetailedRegion ? preciseLocation : "");
  const stateOptions = useMemo(
    () => ibgeStates.length > 0 ? ibgeStates.map((state) => ({ name: state.nome, uf: state.sigla })) : BRAZIL_STATES,
    [ibgeStates],
  );
  const citySuggestions = useMemo(
    () => ibgeCities.length > 0 ? ibgeCities.map((city) => city.nome) : region.state ? CITY_SUGGESTIONS[region.state] ?? [] : [],
    [ibgeCities, region.state],
  );
  const queryPreview = useMemo(
    () => buildCampaignSearchQueries({
      industry: industrySearchTerm || "Nicho",
      location: effectiveLocation || "Região definida",
      searchQueries: extraQueries.filter(Boolean),
      targetWebsiteMode: form.targetWebsiteMode as "any" | "missing_website",
    }),
    [effectiveLocation, extraQueries, form.targetWebsiteMode, industrySearchTerm],
  );
  const selectedSourceOptions = SEARCH_SOURCE_OPTIONS.filter((source) => form.sources.includes(source.value));
  const selectedSourceLabel = selectedSourceOptions.map((source) => source.label).join(", ");
  const sourceSummary = selectedSourceOptions.length > 0 ? selectedSourceLabel : "Google Maps";

  const toggleSource = (source: SearchSource) => {
    setForm((previous) => {
      const selected = previous.sources.includes(source);
      if (selected && previous.sources.length === 1) return previous;

      return {
        ...previous,
        sources: selected
          ? previous.sources.filter((current) => current !== source)
          : [...previous.sources, source],
      };
    });
  };

  useEffect(() => {
    if (!regionOpen || ibgeStates.length > 0) return;
    fetch("https://servicodados.ibge.gov.br/api/v1/localidades/estados?orderBy=nome")
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Falha ao carregar estados"))))
      .then((states: IbgeState[]) => setIbgeStates(states))
      .catch(() => undefined);
  }, [ibgeStates.length, regionOpen]);

  useEffect(() => {
    if (!regionOpen || !region.state) return;
    const selectedState = stateOptions.find((state) => state.name === region.state);
    if (!selectedState?.uf) return;
    fetch(`https://servicodados.ibge.gov.br/api/v1/localidades/estados/${selectedState.uf}/municipios?orderBy=nome`)
      .then((response) => (response.ok ? response.json() : Promise.reject(new Error("Falha ao carregar cidades"))))
      .then((cities: IbgeCity[]) => setIbgeCities(cities))
      .catch(() => setIbgeCities([]));
  }, [region.state, regionOpen, stateOptions]);

  const updateRegion = (key: keyof CampaignRegionConfig, value: string) => {
    const next = { ...region, [key]: value };
    if (key === "state") {
      next.city = "";
      setIbgeCities([]);
    }
    setRegion(next);
    setForm((previous) => ({ ...previous, location: buildRegionLabel(next) }));
  };

  const findStateNameByUf = (uf?: string) =>
    stateOptions.find((state) => state.uf === uf)?.name || BRAZIL_STATES.find((state) => state.uf === uf)?.name || "";

  const loadCep = async () => {
    const cleanCep = cep.replace(/\D/g, "");
    if (cleanCep.length !== 8) {
      setRegionError("Informe um CEP com 8 dígitos.");
      return;
    }

    setLoadingCep(true);
    setRegionError("");
    try {
      const response = await fetch(`https://viacep.com.br/ws/${cleanCep}/json/`);
      if (!response.ok) throw new Error("Falha ao consultar CEP.");
      const data = await response.json() as ViaCepResponse;
      if (data.erro) throw new Error("CEP não encontrado.");

      const nextRegion = {
        country: "Brasil",
        state: findStateNameByUf(data.uf) || region.state,
        city: data.localidade || region.city,
        district: data.bairro || region.district,
        street: data.logradouro || region.street,
      };
      setRegion(nextRegion);
      setForm((previous) => ({ ...previous, location: buildRegionLabel(nextRegion) }));
    } catch (error) {
      setRegionError(error instanceof Error ? error.message : "Falha ao consultar CEP.");
    } finally {
      setLoadingCep(false);
    }
  };

  const addQuery = () => setExtraQueries((queries) => [...queries, ""]);
  const removeQuery = (index: number) => setExtraQueries((queries) => queries.filter((_, currentIndex) => currentIndex !== index));
  const updateQuery = (index: number, value: string) =>
    setExtraQueries((queries) => queries.map((old, currentIndex) => (currentIndex === index ? value : old)));

  const handleSubmit = async (event: React.SyntheticEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setSubmitError("");
    try {
      const campaign = await api.post<{ id: string }>("/campaigns", {
        name: form.name,
        industry: form.industry,
        location: form.location,
        regionConfig: region,
        targetWebsiteMode: form.targetWebsiteMode,
        searchQueries: queryPreview,
        yourService: form.yourService,
        maxResults: Number(form.maxResults),
        contentStyle: form.contentStyle,
        language: form.language,
        source: form.sources[0],
        sources: form.sources,
      });
      await api.post(`/scraper/campaigns/${campaign.id}/start`, {});
      router.push(`/campaigns/${campaign.id}`);
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : "Falha ao criar campanha.");
      setLoading(false);
    }
  };

  const fieldClass = "h-10 rounded-xl border-slate-200 bg-white shadow-sm shadow-slate-950/[0.02] focus-visible:ring-purple-500";
  const regionInputClass = "h-14 rounded-xl border-slate-200 bg-white pl-12 text-base text-slate-950 shadow-sm shadow-slate-950/[0.02] placeholder:text-slate-400 focus-visible:ring-purple-500";
  const regionSelectClass = "h-14 rounded-xl border-slate-200 bg-white px-5 text-base text-slate-950 shadow-sm shadow-slate-950/[0.02] focus:ring-purple-500";

  return (
    <form onSubmit={handleSubmit} className="grid min-h-0 gap-4 min-[1700px]:grid-cols-[minmax(0,1fr)_320px]">
      <div className="grid min-w-0 gap-3 xl:grid-cols-2">
        <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03] xl:col-span-2">
          <CardHeader className="border-b border-slate-100 px-5 py-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Etapa 1</span>
              <Target className="h-4 w-4 text-purple-500" />
              Detalhes da campanha
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="space-y-2">
              <Label>Canal de busca</Label>
              <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
                <button
                  type="button"
                  onClick={() => toggleSource("google_maps")}
                  className={`flex min-h-[92px] items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    form.sources.includes("google_maps")
                      ? "border-purple-500 bg-purple-50/40 text-purple-950 ring-1 ring-purple-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${form.sources.includes("google_maps") ? "bg-purple-100 text-purple-600" : "bg-slate-100 text-slate-500"}`}>
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Google Maps</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Negócios locais</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSource("instagram")}
                  className={`flex min-h-[92px] items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    form.sources.includes("instagram")
                      ? "border-pink-500 bg-pink-50/30 text-pink-950 ring-1 ring-pink-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${form.sources.includes("instagram") ? "bg-pink-100 text-pink-600" : "bg-slate-100 text-slate-500"}`}>
                    <Instagram className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Instagram</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Perfis de marca</p>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => toggleSource("facebook_marketplace")}
                  className={`flex min-h-[92px] items-start gap-3 rounded-xl border p-4 text-left transition-all ${
                    form.sources.includes("facebook_marketplace")
                      ? "border-blue-500 bg-blue-50/30 text-blue-950 ring-1 ring-blue-500"
                      : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                  }`}
                >
                  <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${form.sources.includes("facebook_marketplace") ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-500"}`}>
                    <Store className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Marketplace</p>
                    <p className="mt-1 text-xs leading-5 text-slate-500">Anúncios locais</p>
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Nome da campanha</Label>
              <Input id="name" placeholder="Ex: Catálogo online para restaurantes em Campinas" value={form.name} onChange={set("name")} className={fieldClass} required />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <div className="space-y-2">
                <Label>Nicho</Label>
                <Select value={form.industry} onValueChange={(value) => setForm((previous) => ({ ...previous, industry: value }))}>
                  <SelectTrigger id="industry" className={fieldClass}><SelectValue placeholder="Selecione o nicho" /></SelectTrigger>
                  <SelectContent>
                    {INDUSTRIES.map((industry) => (
                      <SelectItem key={industry.value} value={industry.value}>{industry.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <Label htmlFor="location">Região</Label>
                  <Button type="button" variant="outline" size="sm" className="h-8 rounded-xl text-xs" onClick={() => setRegionOpen(true)}>
                    <SlidersHorizontal className="mr-1 h-3.5 w-3.5" />Precisar região
                  </Button>
                </div>
                <Input id="location" placeholder="Ex: Brasil > Bahia > Salvador > Rua do Salete" value={form.location} onChange={set("location")} className={fieldClass} required />
              </div>
            </div>

            <div className="grid gap-4 border-t border-slate-100 pt-4">
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Etapa 4</span>
                  <Label htmlFor="service">Seu serviço ou produto</Label>
                </div>
                <Textarea id="service" placeholder="Descreva o que você quer vender para esses leads..." value={form.yourService} onChange={set("yourService")} className="min-h-24 resize-none rounded-xl border-slate-200 shadow-sm shadow-slate-950/[0.02] focus-visible:ring-purple-500" required />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="space-y-2">
                  <Label>Máximo de resultados</Label>
                  <Select value={form.maxResults} onValueChange={(value) => setForm((previous) => ({ ...previous, maxResults: value }))}>
                    <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {["10", "20", "50", "100"].map((amount) => (
                        <SelectItem key={amount} value={amount}>{amount} leads</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Estilo da abordagem</Label>
                  <Select value={form.contentStyle} onValueChange={(value) => setForm((previous) => ({ ...previous, contentStyle: value }))}>
                    <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="professional">Profissional</SelectItem>
                      <SelectItem value="friendly">Amigável</SelectItem>
                      <SelectItem value="balanced">Equilibrado</SelectItem>
                      <SelectItem value="casual">Casual</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Idioma</Label>
                  <Select value={form.language} onValueChange={(value) => setForm((previous) => ({ ...previous, language: value }))}>
                    <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="portuguese">Português</SelectItem>
                      <SelectItem value="english">Inglês</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {submitError && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                {submitError}
              </div>
            )}

            <div className="flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <Button type="button" variant="outline" onClick={() => router.back()} className="h-10 rounded-xl">Cancelar</Button>
              <Button type="submit" className="h-10 rounded-xl bg-purple-600 shadow-sm shadow-purple-500/20 hover:bg-purple-700" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</> : "Iniciar campanha"}
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-gradient-to-br from-white to-purple-50/40 shadow-sm shadow-purple-950/[0.03]">
          <CardHeader className="border-b border-purple-100 px-5 py-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Etapa 2</span>
              <ShieldCheck className="h-4 w-4 text-purple-600" />
              Regra inteligente da busca
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <button
              type="button"
              className="flex w-full items-start gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left shadow-sm transition-colors hover:border-purple-200 hover:bg-purple-50/30"
              onClick={() => setForm((previous) => ({
                ...previous,
                targetWebsiteMode: previous.targetWebsiteMode === "missing_website" ? "any" : "missing_website",
              }))}
            >
              <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg border ${
                form.targetWebsiteMode === "missing_website" ? "border-purple-500 bg-purple-600 text-white" : "border-slate-300"
              }`}>
                {form.targetWebsiteMode === "missing_website" && <Check className="h-4 w-4" />}
              </span>
              <span>
                <span className="block text-sm font-semibold text-slate-950">Priorizar empresas sem site ou sem catálogo</span>
                <span className="mt-1 block text-xs leading-5 text-slate-500">
                  O motor gera buscas com intenção “sem site” e “sem catálogo online”, ideal para vender catálogo digital.
                </span>
              </span>
            </button>

            <div className="flex flex-wrap gap-2">
              <Badge variant="secondary">Fontes: {sourceSummary}</Badge>
              <Badge variant={form.industry ? "success" : "secondary"}>Nicho: {selectedIndustry?.label ?? "pendente"}</Badge>
              <Badge variant={form.location ? "success" : "secondary"}>Região: {form.location || "pendente"}</Badge>
              <Badge variant={form.targetWebsiteMode === "missing_website" ? "warning" : "secondary"}>
                {form.targetWebsiteMode === "missing_website" ? "Foco: empresas sem site" : "Foco: qualquer empresa"}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
          <CardHeader className="border-b border-slate-100 px-5 py-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Etapa 3</span>
              <Wand2 className="h-4 w-4 text-purple-500" />
              Buscas automáticas geradas por IA
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="grid max-h-48 gap-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
              {queryPreview.map((query) => (
                <div key={query} className="flex items-start gap-2 rounded-xl bg-white px-3 py-2 text-xs leading-5 text-slate-700 shadow-sm shadow-slate-950/[0.02]">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-purple-500" />
                  <span>{query}</span>
                </div>
              ))}
            </div>

            <div className="space-y-2">
              <Label className="text-xs text-slate-500">Buscas extras opcionais</Label>
              {extraQueries.map((query, index) => (
                <div key={index} className="flex gap-2">
                  <Input placeholder="Ex: pizzarias artesanais, pet shops, clínicas populares..." value={query} onChange={(event) => updateQuery(index, event.target.value)} className={fieldClass} />
                  {extraQueries.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeQuery(index)} className="shrink-0 rounded-xl text-muted-foreground hover:text-destructive">
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" onClick={addQuery} className="mt-1 rounded-xl text-xs">
                <Plus className="mr-1 h-3.5 w-3.5" />Adicionar busca
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="hidden border-slate-200 bg-white shadow-sm shadow-slate-950/[0.03]">
          <CardHeader className="border-b border-slate-100 px-5 py-3">
            <CardTitle className="flex flex-wrap items-center gap-2 text-base">
              <span className="rounded-full bg-purple-100 px-2 py-0.5 text-xs font-semibold text-purple-700">Etapa 4</span>
              Oferta e abordagem
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 p-5">
            <div className="space-y-2">
              <Label htmlFor="service">Seu serviço ou produto</Label>
              <Textarea id="service-legacy" placeholder="Descreva o que você quer vender para esses leads..." value={form.yourService} onChange={set("yourService")} className="min-h-20 resize-none rounded-xl border-slate-200 shadow-sm shadow-slate-950/[0.02] focus-visible:ring-purple-500" />
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="space-y-2">
                <Label>Máximo de resultados</Label>
                <Select value={form.maxResults} onValueChange={(value) => setForm((previous) => ({ ...previous, maxResults: value }))}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {["10", "20", "50", "100"].map((amount) => (
                      <SelectItem key={amount} value={amount}>{amount} leads</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Estilo da abordagem</Label>
                <Select value={form.contentStyle} onValueChange={(value) => setForm((previous) => ({ ...previous, contentStyle: value }))}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="professional">Profissional</SelectItem>
                    <SelectItem value="friendly">Amigável</SelectItem>
                    <SelectItem value="balanced">Equilibrado</SelectItem>
                    <SelectItem value="casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Idioma</Label>
                <Select value={form.language} onValueChange={(value) => setForm((previous) => ({ ...previous, language: value }))}>
                  <SelectTrigger className={fieldClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="portuguese">Português</SelectItem>
                    <SelectItem value="english">Inglês</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex-col items-stretch gap-3 border-t border-slate-100 px-5 py-4 sm:flex-row sm:items-center">
            {submitError && (
              <div className="w-full rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 sm:flex-1">
                {submitError}
              </div>
            )}
            <div className="flex gap-3 sm:ml-auto">
              <Button type="button" variant="outline" onClick={() => router.back()} className="h-10 rounded-xl">Cancelar</Button>
              <Button type="submit" className="h-10 rounded-xl bg-purple-600 shadow-sm shadow-purple-500/20 hover:bg-purple-700" disabled={loading}>
                {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Iniciando...</> : "Iniciar campanha"}
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>

      <aside className="hidden space-y-3 min-[1700px]:sticky min-[1700px]:top-4 min-[1700px]:block min-[1700px]:self-start">
        <Card className="border-slate-200 bg-slate-950 text-white shadow-xl shadow-slate-950/10">
          <CardContent className="space-y-3 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-200 ring-1 ring-purple-400/20">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold">Assistente</p>
                <p className="text-xs text-slate-400">Resumo dos parâmetros ativos</p>
              </div>
            </div>
            <div className="space-y-2 rounded-2xl bg-white/[0.04] p-3 text-sm">
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Fontes</p>
                <p className="mt-1 text-slate-100">{sourceSummary}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Nicho</p>
                <p className="mt-1 text-slate-100">{selectedIndustry?.label ?? "Aguardando seleção"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Região</p>
                <p className="mt-1 text-slate-100">{effectiveLocation || "Aguardando região"}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-[0.16em] text-slate-500">Buscas</p>
                <p className="mt-1 text-slate-100">{queryPreview.length} combinações prontas</p>
              </div>
            </div>
            <div className="rounded-2xl border border-purple-400/20 bg-purple-500/10 p-3 text-xs leading-5 text-purple-100">
              Fluxo recomendado: defina região precisa, escolha o nicho, confirme a regra “sem site” e inicie a campanha.
            </div>
          </CardContent>
        </Card>
      </aside>

      <RegionDialog
        open={regionOpen}
        onOpenChange={setRegionOpen}
        region={region}
        stateOptions={stateOptions}
        citySuggestions={citySuggestions}
        cep={cep}
        setCep={setCep}
        loadingCep={loadingCep}
        regionError={regionError}
        updateRegion={updateRegion}
        loadCep={loadCep}
        regionInputClass={regionInputClass}
        regionSelectClass={regionSelectClass}
      />
    </form>
  );
}

function RegionDialog({
  open,
  onOpenChange,
  region,
  stateOptions,
  citySuggestions,
  cep,
  setCep,
  loadingCep,
  regionError,
  updateRegion,
  loadCep,
  regionInputClass,
  regionSelectClass,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  region: CampaignRegionConfig;
  stateOptions: Array<{ name: string; uf: string }>;
  citySuggestions: string[];
  cep: string;
  setCep: (cep: string) => void;
  loadingCep: boolean;
  regionError: string;
  updateRegion: (key: keyof CampaignRegionConfig, value: string) => void;
  loadCep: () => void;
  regionInputClass: string;
  regionSelectClass: string;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-[calc(100vw-1rem)] max-w-5xl overflow-y-auto border-slate-200 bg-white p-0 text-slate-950 shadow-2xl shadow-slate-950/25 sm:w-full">
        <DialogHeader className="flex-col items-start gap-4 space-y-0 px-4 pb-4 pt-6 text-left sm:flex-row sm:gap-5 sm:px-8 sm:pb-5 sm:pt-8 sm:text-left">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-purple-600 shadow-sm sm:h-16 sm:w-16">
            <MapPin className="h-7 w-7 sm:h-9 sm:w-9" />
          </div>
          <div className="pr-8 sm:pr-10">
            <DialogTitle className="text-2xl font-semibold leading-tight text-slate-950 sm:text-3xl">
              Configurar região precisa
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base sm:leading-7">
              Monte a região no formato País &gt; Estado &gt; Cidade &gt; Bairro &gt; Rua para buscar com mais precisão.
            </DialogDescription>
          </div>
        </DialogHeader>
        <div className="grid gap-4 px-4 pb-5 sm:gap-6 sm:px-8 sm:pb-7">
          <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-950/[0.03] sm:p-5">
            <Label htmlFor="cep" className="text-base font-medium text-slate-900">Buscar endereço por CEP</Label>
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_190px]">
              <Input id="cep" inputMode="numeric" placeholder="Ex: 40050-000" value={cep} onChange={(event) => setCep(event.target.value)} className="h-14 rounded-xl border-slate-200 bg-white px-5 text-base text-slate-950 shadow-sm shadow-slate-950/[0.02] placeholder:text-slate-400 focus-visible:ring-purple-500" />
              <Button type="button" variant="outline" onClick={loadCep} disabled={loadingCep} className="h-14 justify-center rounded-xl border-slate-200 bg-white px-5 text-base font-medium text-purple-700 shadow-sm shadow-slate-950/[0.02] hover:bg-purple-50 hover:text-purple-800 disabled:bg-slate-50 disabled:text-slate-400">
                {loadingCep ? <Loader2 className="h-5 w-5 animate-spin" /> : <Search className="h-5 w-5" />}
                <span className="ml-2">Buscar CEP</span>
              </Button>
            </div>
            {regionError && <p className="mt-3 text-sm text-red-600">{regionError}</p>}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="space-y-3">
              <Label htmlFor="country" className="text-base font-medium text-slate-950">País</Label>
              <div className="relative">
                <span className="absolute left-5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md bg-emerald-100 text-xs font-semibold text-emerald-700">BR</span>
                <Input id="country" value={region.country ?? "Brasil"} onChange={(event) => updateRegion("country", event.target.value)} className={regionInputClass} />
              </div>
            </div>
            <div className="space-y-3">
              <Label className="text-base font-medium text-slate-950">Estado</Label>
              <Select value={region.state || undefined} onValueChange={(value) => updateRegion("state", value)}>
                <SelectTrigger className={regionSelectClass}><SelectValue placeholder="Selecione o estado" /></SelectTrigger>
                <SelectContent className="border-slate-200 bg-white text-slate-950">
                  {stateOptions.map((state) => <SelectItem key={state.uf} value={state.name}>{state.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 md:gap-6">
            <div className="space-y-3">
              <Label htmlFor="city" className="text-base font-medium text-slate-950">Cidade</Label>
              <div className="relative">
                <Building2 className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600" />
                <Input id="city" list="buscador-lead-city-suggestions" value={region.city ?? ""} onChange={(event) => updateRegion("city", event.target.value)} placeholder="Ex: Salvador" className={regionInputClass} />
              </div>
              <datalist id="buscador-lead-city-suggestions">
                {citySuggestions.map((city) => <option key={city} value={city} />)}
              </datalist>
            </div>
            <div className="space-y-3">
              <Label htmlFor="district" className="text-base font-medium text-slate-950">Bairro</Label>
              <div className="relative">
                <Home className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600" />
                <Input id="district" value={region.district ?? ""} onChange={(event) => updateRegion("district", event.target.value)} placeholder="Ex: Nazaré" className={regionInputClass} />
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <Label htmlFor="street" className="text-base font-medium text-slate-950">Rua ou ponto de referência</Label>
            <div className="relative">
              <MapPin className="absolute left-5 top-1/2 h-5 w-5 -translate-y-1/2 text-purple-600" />
              <Input id="street" value={region.street ?? ""} onChange={(event) => updateRegion("street", event.target.value)} placeholder="Ex: Rua do Salete" className={regionInputClass} />
            </div>
          </div>

          <div className="flex flex-col items-start gap-3 rounded-2xl border border-purple-200 bg-purple-50/70 p-4 shadow-sm shadow-purple-950/[0.03] sm:flex-row sm:items-center sm:gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-700 ring-1 ring-purple-200">
              <MapPin className="h-8 w-8" />
            </div>
            <div>
              <div className="text-lg font-semibold text-purple-700">Região final</div>
              <p className="mt-1 text-base text-slate-950">{buildRegionLabel(region) || "Brasil"}</p>
            </div>
          </div>
        </div>
        <DialogFooter className="flex-col gap-3 border-t border-slate-200 px-4 py-4 sm:flex-row sm:justify-end sm:space-x-0 sm:px-8 sm:py-6">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="h-12 w-full rounded-xl border-slate-200 bg-white px-6 text-base font-medium text-slate-700 shadow-sm hover:bg-slate-50 hover:text-slate-950 sm:h-14 sm:w-auto sm:min-w-36 sm:px-8">
            Cancelar
          </Button>
          <Button type="button" className="h-12 w-full rounded-xl bg-purple-700 px-6 text-base font-semibold text-white shadow-lg shadow-purple-700/25 hover:bg-purple-800 sm:h-14 sm:w-auto sm:min-w-56 sm:px-8" onClick={() => onOpenChange(false)}>
            <MapPin className="mr-2 h-5 w-5" />
            Aplicar região
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
