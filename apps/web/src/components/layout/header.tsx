"use client";

import { Bell, Search } from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="min-h-16 flex-shrink-0 border-b border-slate-200/80 bg-white/95 px-4 py-3 backdrop-blur lg:h-[72px] lg:px-7">
      <div className="flex items-center gap-3">
        <div className="flex min-w-0 flex-1 items-center gap-3 lg:hidden">
          <AppLogo compact />
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">Buscador de Lead</p>
            <p className="truncate text-[11px] text-slate-500">IA para prospeccao local</p>
          </div>
        </div>
        <div className="hidden max-w-xl flex-1 lg:block">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <Input
              placeholder="Buscar leads e campanhas..."
              className="h-11 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm shadow-sm shadow-slate-950/[0.02] placeholder:text-slate-400 focus-visible:bg-white"
            />
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Button variant="ghost" size="icon" className="relative rounded-xl hover:bg-slate-100">
            <Bell className="h-4 w-4" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-purple-500" />
          </Button>
        </div>
      </div>
      <div className="mt-3 lg:hidden">
        <div className="relative">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Buscar leads e campanhas..."
            className="h-10 rounded-xl border-slate-200 bg-slate-50 pl-11 text-sm shadow-sm shadow-slate-950/[0.02] placeholder:text-slate-400 focus-visible:bg-white"
          />
        </div>
      </div>
    </header>
  );
}
