import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { LeadsList } from "@/components/leads/leads-list";
import { Button } from "@/components/ui/button";
import { PageHero } from "@/components/ui/page-hero";

export default function LeadsPage() {
  return (
    <div className="space-y-6">
      <PageHero
        icon={Users}
        eyebrow="CRM de prospecção"
        title="Leads captados"
        description="Acompanhe empresas encontradas, score, prioridade e evolução do contato comercial em uma visão única."
        action={(
          <Button asChild className="rounded-xl bg-purple-600 hover:bg-purple-700">
            <Link href="/campaigns/new"><Plus className="mr-2 h-4 w-4" />Nova campanha</Link>
          </Button>
        )}
      />
      <LeadsList />
    </div>
  );
}
