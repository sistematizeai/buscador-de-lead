"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, Check, Database, Key, Loader2, Lock, RefreshCw, Server } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { api } from "@/lib/api";

interface RuntimeStatus {
  database: { ok: boolean; message: string };
  scraper: { ok: boolean; provider: string; binaryPath: string; message: string };
  auth: { ok: boolean; message: string };
  ai: { configured: boolean; source: string; model: string; baseURL: string | null; message: string };
  app: { appUrl: string; apiUrl: string };
}

function StatusBadge({ ok, warning }: { ok: boolean; warning?: boolean }) {
  if (ok) return <Badge variant="success">OK</Badge>;
  if (warning) return <Badge variant="warning">Fallback</Badge>;
  return <Badge variant="destructive">Verificar</Badge>;
}

function StatusRow({
  icon: Icon,
  title,
  detail,
  ok,
  warning,
}: {
  icon: typeof Database;
  title: string;
  detail: string;
  ok: boolean;
  warning?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
      <div className="flex min-w-0 items-start gap-3">
        <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium">{title}</p>
          <p className="break-words text-xs text-muted-foreground">{detail}</p>
        </div>
      </div>
      <div className="sm:shrink-0">
        <StatusBadge ok={ok} warning={warning} />
      </div>
    </div>
  );
}

export function SettingsPage() {
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [statusError, setStatusError] = useState("");

  const [openaiKey, setOpenaiKey] = useState("");
  const [openaiModel, setOpenaiModel] = useState("gpt-4o-mini");
  const [openaiBase, setOpenaiBase] = useState("");
  const [savingIntegration, setSavingIntegration] = useState(false);
  const [savedIntegration, setSavedIntegration] = useState(false);

  const loadStatus = useCallback(async () => {
    setStatusLoading(true);
    setStatusError("");
    try {
      setStatus(await api.get<RuntimeStatus>("/settings/runtime-status"));
    } catch (error) {
      setStatusError(error instanceof Error ? error.message : "Falha ao carregar status");
    } finally {
      setStatusLoading(false);
    }
  }, []);

  useEffect(() => { void loadStatus(); }, [loadStatus]);

  useEffect(() => {
    api.get<Array<{ type: string; config: { model?: string; baseURL?: string; configured?: boolean } }>>("/settings/integrations")
      .then((integrations) => {
        const openai = integrations.find((i) => i.type === "openai");
        if (openai) {
          setOpenaiModel(openai.config.model ?? "gpt-4o-mini");
          setOpenaiBase(openai.config.baseURL ?? "");
        }
      })
      .catch(console.error);
  }, []);

  const [apiKeys, setApiKeys] = useState<Array<{ id: string; name: string; createdAt: string }>>([]);
  const [newKeyName, setNewKeyName] = useState("");
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [keysLoading, setKeysLoading] = useState(true);

  const loadApiKeys = useCallback(async () => {
    setKeysLoading(true);
    try {
      const keys = await api.get<any[]>("/settings/api-keys");
      setApiKeys(keys);
    } catch (e) {
      console.error(e);
    } finally {
      setKeysLoading(false);
    }
  }, []);

  const handleGenerateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName.trim()) return;
    try {
      const res = await api.post<{ id: string; key: string }>("/settings/api-keys", { name: newKeyName });
      setGeneratedKey(res.key);
      setNewKeyName("");
      await loadApiKeys();
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeleteKey = async (id: string) => {
    try {
      await api.delete(`/settings/api-keys/${id}`);
      await loadApiKeys();
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    void loadApiKeys();
  }, [loadApiKeys]);

  const saveAiIntegration = async () => {
    setSavingIntegration(true);
    try {
      await api.post("/settings/integrations", {
        type: "openai",
        name: "OpenAI / API compatível",
        config: { apiKey: openaiKey.trim(), model: openaiModel, baseURL: openaiBase },
      });
      setOpenaiKey("");
      setSavedIntegration(true);
      await loadStatus();
      setTimeout(() => setSavedIntegration(false), 2000);
    } catch (e) {
      console.error("Falha ao salvar integração:", e);
    } finally {
      setSavingIntegration(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Configuração pessoal</h1>
        <p className="text-muted-foreground">Status local, motor de scraping e configuração de IA.</p>
      </div>

      <Card>
        <CardHeader className="flex flex-col items-stretch gap-4 space-y-0 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="text-base">Status do sistema</CardTitle>
            <CardDescription>Verificações da sua instância pessoal do Buscador de Lead.</CardDescription>
          </div>
          <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={loadStatus} disabled={statusLoading}>
            {statusLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
            Atualizar
          </Button>
        </CardHeader>
        <CardContent className="space-y-3">
          {statusError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
              {statusError}
            </div>
          )}
          {!status && !statusError ? (
            <div className="flex items-center gap-2 py-4 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Carregando status
            </div>
          ) : status ? (
            <>
              <StatusRow icon={Database} title="PostgreSQL" detail={status.database.message} ok={status.database.ok} />
              <StatusRow
                icon={Bot}
                title={`Scraper: ${status.scraper.provider}`}
                detail={status.scraper.binaryPath}
                ok={status.scraper.ok}
              />
              <StatusRow icon={Lock} title="Segredo de login" detail={status.auth.message} ok={status.auth.ok} />
              <StatusRow
                icon={Key}
                title={`IA: ${status.ai.model}`}
                detail={status.ai.configured ? `Configurada por ${status.ai.source === "settings" ? "Configurações" : "ambiente"}` : status.ai.message}
                ok={status.ai.configured}
                warning={!status.ai.configured}
              />
              <StatusRow icon={Server} title="URLs da aplicação" detail={`${status.app.appUrl} -> ${status.app.apiUrl}`} ok />
            </>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Configuração de IA</CardTitle>
          <CardDescription>Salva aqui e usada para gerar conteúdo comercial dos leads.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Chave da API</Label>
            <div className="flex gap-2">
              <Input
                type="password"
                placeholder={status?.ai.configured ? "Chave ja configurada no backend" : "Cole uma nova chave"}
                value={openaiKey}
                onChange={(e) => setOpenaiKey(e.target.value)}
                className="flex-1"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              A chave salva nao e exibida no navegador. Preencha este campo apenas para criar ou substituir a chave no backend.
            </p>
          </div>

          <Separator />

          <div className="space-y-2">
            <Label>Modelo</Label>
            <Input
              placeholder="gpt-4o-mini"
              value={openaiModel}
              onChange={(e) => setOpenaiModel(e.target.value)}
            />
          </div>

          <Separator />

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label>URL base personalizada</Label>
              <Badge variant="secondary">Opcional</Badge>
            </div>
            <Input
              placeholder="https://openrouter.ai/api/v1"
              value={openaiBase}
              onChange={(e) => setOpenaiBase(e.target.value)}
            />
          </div>

          <Button className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto" onClick={saveAiIntegration} disabled={savingIntegration}>
            {savingIntegration ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : savedIntegration ? (
              <Check className="mr-2 h-4 w-4" />
            ) : null}
            {savedIntegration ? "Salvo" : "Salvar configuração de IA"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Chaves de API</CardTitle>
          <CardDescription>Crie chaves de API para integrar o Buscador de Lead com outras ferramentas externas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleGenerateKey} className="flex flex-col gap-2 sm:flex-row">
            <Input
              placeholder="Nome da chave (ex: Zapier, n8n)"
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1"
              required
            />
            <Button type="submit" className="w-full bg-purple-600 hover:bg-purple-700 sm:w-auto">Gerar chave</Button>
          </form>

          {generatedKey && (
            <div className="rounded-lg border border-purple-500/30 bg-purple-500/10 p-3 text-sm">
              <p className="font-semibold text-purple-400">Chave de API gerada com sucesso!</p>
              <p className="text-xs text-muted-foreground mt-0.5 mb-2">Copie esta chave agora. Ela não será exibida novamente por segurança.</p>
              <div className="bg-zinc-950 p-2.5 rounded border border-zinc-800 font-mono text-xs select-all mb-3 break-all text-purple-300">
                {generatedKey}
              </div>
              <Button size="sm" variant="outline" onClick={() => navigator.clipboard.writeText(generatedKey)}>
                Copiar chave
              </Button>
            </div>
          )}

          <div className="space-y-2 mt-4">
            <h3 className="text-sm font-semibold text-muted-foreground">Minhas Chaves</h3>
            {keysLoading ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3 w-3 animate-spin" /> Carregando chaves...
              </div>
            ) : apiKeys.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">Nenhuma chave de API gerada ainda.</p>
            ) : (
              <div className="divide-y border border-zinc-800 rounded-lg overflow-hidden">
                {apiKeys.map((key) => (
                  <div key={key.id} data-testid="key-row" className="flex flex-col gap-3 bg-zinc-900/20 p-3 text-xs sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-medium">{key.name}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">Criada em: {new Date(key.createdAt).toLocaleDateString()}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 justify-start text-destructive hover:bg-destructive/10 sm:justify-center"
                      onClick={() => handleDeleteKey(key.id)}
                    >
                      Excluir
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
