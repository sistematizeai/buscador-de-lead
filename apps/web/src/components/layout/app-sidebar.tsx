"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Search,
  Settings,
  Users,
  Zap,
} from "lucide-react";
import { AppLogo } from "@/components/brand/app-logo";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { cn, getInitials } from "@/lib/utils";

const navItems = [
  { title: "Painel", href: "/dashboard", icon: LayoutDashboard },
  { title: "Campanhas", href: "/campaigns", icon: Megaphone },
  { title: "Localizar Empresa", href: "/company-search", icon: Search },
  { title: "Leads", href: "/leads", icon: Users },
  { title: "Análises", href: "/analytics", icon: BarChart3 },
];

const bottomItems = [
  { title: "Integrações", href: "/integrations", icon: Zap },
  { title: "Configurações", href: "/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { user, workspace, logout } = useAuth();

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <aside className="hidden w-[280px] flex-shrink-0 flex-col border-r border-white/10 bg-[#17171b] text-slate-200 lg:flex">
      <div className="flex h-20 items-center border-b border-white/10 px-5">
        <AppLogo />
      </div>

      <div className="border-b border-white/10 px-4 py-4">
        <button className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3 text-sm text-slate-100 transition-colors hover:bg-white/[0.085]">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 shadow-lg shadow-purple-950/20">
            <Building2 className="h-4 w-4 text-white" />
          </div>
          <span className="flex-1 truncate text-left font-medium">
            {workspace?.name ?? "Meu workspace"}
          </span>
          <ChevronDown className="h-4 w-4 shrink-0 text-slate-500" />
        </button>
      </div>

      <nav className="flex-1 space-y-1.5 px-4 py-5">
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== "/" && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-950/25"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-200")} />
              <span className="flex-1">{item.title}</span>
            </Link>
          );
        })}
      </nav>

      <Separator className="bg-white/10" />

      <nav className="space-y-1.5 px-4 py-4">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                isActive
                  ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg shadow-blue-950/25"
                  : "text-slate-300 hover:bg-white/[0.07] hover:text-white",
              )}
            >
              <item.icon className={cn("h-4 w-4 shrink-0", isActive ? "text-white" : "text-slate-500 group-hover:text-slate-200")} />
              {item.title}
            </Link>
          );
        })}
      </nav>

      <div className="px-4 pb-4">
        <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.055] px-3 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-purple-600">
            <span className="text-xs font-semibold text-white">
              {user ? getInitials(user.name) : "A"}
            </span>
          </div>
          <div className="min-w-0 flex-1 text-left">
            <p className="truncate text-xs font-medium text-slate-100">
              {user?.name ?? "Admin"}
            </p>
            <p className="truncate text-[11px] text-slate-400">
              {user?.email ?? "admin@buscadordelead.local"}
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="shrink-0 text-slate-500 transition-colors hover:text-white"
            title="Sair"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
