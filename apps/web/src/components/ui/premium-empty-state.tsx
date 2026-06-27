import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface PremiumEmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
  className?: string;
}

export function PremiumEmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: PremiumEmptyStateProps) {
  return (
    <div className={cn(
      "relative overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center shadow-sm shadow-slate-950/[0.02]",
      className,
    )}>
      <div className="absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-purple-300 to-transparent" />
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-50 text-purple-600 ring-1 ring-purple-100">
        <Icon className="h-7 w-7" />
      </div>
      <h3 className="text-base font-semibold text-slate-950">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-500">{description}</p>
      {action && <div className="mt-5 flex justify-center">{action}</div>}
    </div>
  );
}
