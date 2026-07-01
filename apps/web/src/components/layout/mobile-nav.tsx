"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  LayoutDashboard,
  Megaphone,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

const mobileNavItems = [
  { title: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { title: "Campanhas", href: "/campaigns", icon: Megaphone },
  { title: "Buscar", href: "/company-search", icon: Search },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Analises", href: "/analytics", icon: BarChart3 },
  { title: "Integr.", href: "/integrations", icon: Zap },
  { title: "Config.", href: "/settings", icon: Settings },
];

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-slate-200 bg-white/95 px-2 pb-[max(env(safe-area-inset-bottom),0.5rem)] pt-2 shadow-[0_-12px_30px_rgba(15,23,42,0.08)] backdrop-blur lg:hidden">
      <div className="grid grid-cols-7 gap-1">
        {mobileNavItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-[10px] font-medium leading-none transition-colors",
                isActive
                  ? "bg-purple-50 text-purple-700"
                  : "text-slate-500 hover:bg-slate-50 hover:text-slate-900",
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span className="max-w-full truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
