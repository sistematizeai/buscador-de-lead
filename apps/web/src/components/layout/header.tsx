"use client";

import { Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function Header() {
  return (
    <header className="h-[72px] border-b border-slate-200/80 flex items-center gap-4 px-7 bg-white/95 backdrop-blur flex-shrink-0">
      <div className="flex-1 max-w-xl">
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
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-purple-500 rounded-full" />
        </Button>
      </div>
    </header>
  );
}
