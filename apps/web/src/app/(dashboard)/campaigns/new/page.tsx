import type { Metadata } from "next";
import { CreateCampaignForm } from "@/components/campaigns/create-campaign-form";

export const metadata: Metadata = { title: "Nova campanha | Buscador de Lead" };

export default function NewCampaignPage() {
  return (
    <div className="max-w-6xl">
      <div className="mb-6 rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm shadow-slate-950/[0.03]">
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">Nova campanha</h1>
        <p className="text-sm text-slate-500">Configure uma campanha de descoberta de leads com nicho, região e regra comercial bem definidos.</p>
      </div>
      <CreateCampaignForm />
    </div>
  );
}
