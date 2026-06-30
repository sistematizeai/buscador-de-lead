import type { Metadata } from "next";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";

export const metadata: Metadata = { title: "Nova campanha | Buscador de Lead" };

export default function NewCampaignPage() {
  return (
    <div className="mx-auto w-full max-w-[1500px]">
      <div className="mb-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm shadow-slate-950/[0.03]">
        <h1 className="text-xl font-bold tracking-tight text-slate-950">Nova campanha</h1>
        <p className="text-sm text-slate-500">Configure nicho, região, fonte e oferta em um fluxo compacto.</p>
      </div>
      <CreateCampaignForm />
    </div>
  );
}
