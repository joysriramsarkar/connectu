
"use client";

import './globals.css';
import { Toaster } from "@/components/ui/toaster";
import { Sidebar } from '@/components/sidebar';
import { usePathname } from 'next/navigation';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const showSidebar = pathname !== '/login' && pathname !== '/signup';

  return (
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
          {showSidebar && <Sidebar />}
          <main className="flex-1 overflow-y-auto">
             <div className="w-full">
                {children}
             </div>
          </main>
        </div>
        <Toaster />
      </body>
    </html>
  );
}
