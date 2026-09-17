"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { MobileNav } from "@/components/mobile-nav";
import { Toaster } from "@/components/ui/toaster";
import { I18nProvider } from "@/context/i18n";
import AuthProvider from "@/components/auth-provider";

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const showNav = pathname !== "/login" && pathname !== "/signup";

  return (
    <AuthProvider>
      <I18nProvider>
        <div className="flex min-h-screen w-full">
          {showNav && <Sidebar />}
          <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
            <div className="w-full">{children}</div>
          </main>
          {showNav && <MobileNav />}
        </div>
        <Toaster />
      </I18nProvider>
    </AuthProvider>
  );
}
