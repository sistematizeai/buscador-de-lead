import { CampaignsList } from "@/components/campaigns/campaigns-list";

export default function CampaignsPage() {
  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-950/[0.03]">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-950">Campanhas</h1>
          <p className="text-sm text-slate-500">
            Crie buscas por nicho e região para encontrar empresas prontas para receber uma oferta.
          </p>
        </div>
      </div>
      <CampaignsList />
    </div>
  );
}
