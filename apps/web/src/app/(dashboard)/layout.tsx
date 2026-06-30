import { AppSidebar } from "@/components/layout/app-sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <div className="fixed inset-0 flex overflow-hidden bg-slate-50">
        <AppSidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto px-4 py-4 pb-28 sm:px-5 lg:p-5">{children}</main>
        </div>
        <MobileNav />
      </div>
    </AuthGuard>
  );
}
