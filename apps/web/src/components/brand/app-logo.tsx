"use client";

import { MapPin, Radar, Search } from "lucide-react";
import { cn } from "@/lib/utils";

interface AppLogoProps {
  compact?: boolean;
  inverse?: boolean;
  className?: string;
}

export function AppLogo({ compact = false, inverse = false, className }: AppLogoProps) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className={cn(
        "relative flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-lg",
        inverse
          ? "bg-white text-purple-700 shadow-purple-950/20"
          : "bg-gradient-to-br from-purple-600 via-violet-600 to-blue-600 text-white shadow-purple-600/20",
      )}>
        <Radar className="h-6 w-6" />
        <span className={cn(
          "absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full border-2",
          inverse ? "border-slate-950 bg-purple-600 text-white" : "border-slate-950 bg-white text-purple-700",
        )}>
          <MapPin className="h-2.5 w-2.5" />
        </span>
      </div>
      {!compact && (
        <div className="min-w-0">
          <div className={cn("flex items-center gap-1.5 font-semibold leading-tight", inverse ? "text-white" : "text-white")}>
            <Search className="h-3.5 w-3.5 text-purple-400" />
            <span className="truncate">Buscador de Lead</span>
          </div>
          <p className={cn("mt-0.5 truncate text-[11px] leading-none", inverse ? "text-slate-400" : "text-slate-400")}>
            IA para prospecção local
          </p>
        </div>
      )}
    </div>
  );
}
