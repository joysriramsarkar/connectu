
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from '@/components/sidebar';
import { MobileNav } from '@/components/mobile-nav';
import { usePathname } from 'next/navigation';
import { I18nProvider } from '@/context/i18n';
import AuthProvider from '@/components/auth-provider';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showNav = pathname !== '/login' && pathname !== '/signup';

  return (
    <AuthProvider>
      <I18nProvider>
        <html lang="bn" suppressHydrationWarning>
          <head>
            <title>ConnectU</title>
            <meta name="description" content="Connect with your friends and the world around you on ConnectU." />
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
            <link href="https://fonts.googleapis.com/css2?family=Inter&display=swap" rel="stylesheet" />
          </head>
          <body className="font-body antialiased bg-background text-foreground">
            <div className="flex min-h-screen w-full">
              {showNav && <Sidebar />}
              <main className="flex-1 overflow-y-auto pb-16 md:pb-0">
                 <div className="w-full">
                    {children}
                 </div>
              </main>
              {showNav && <MobileNav />}
            </div>
            <Toaster />
          </body>
        </html>
      </I18nProvider>
    </AuthProvider>
  );
}
