import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  icon?: LucideIcon;
  eyebrow?: string;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function PageHero({ icon: Icon, eyebrow, title, description, action, className }: PageHeroProps) {
  return (
    <section className={cn(
      "rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm shadow-slate-950/[0.03] sm:rounded-3xl sm:px-6 sm:py-5",
      className,
    )}>
      <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex min-w-0 items-start gap-3 sm:gap-4">
          {Icon && (
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg shadow-purple-600/20 sm:h-12 sm:w-12">
              <Icon className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
          )}
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 text-xs font-semibold uppercase tracking-[0.18em] text-purple-600">{eyebrow}</p>}
            <h1 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">{title}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
        {action && <div className="w-full shrink-0 [&>*]:w-full sm:w-auto sm:[&>*]:w-auto">{action}</div>}
      </div>
    </section>
  );
}
