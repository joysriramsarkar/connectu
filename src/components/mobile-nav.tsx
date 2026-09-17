"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, User, Bell, Search } from "lucide-react";
import { useI18n } from "@/context/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { useAuth } from "@/context/auth";

export function MobileNav() {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const { firebaseUser, idToken, loading } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  const fetchUnreadCount = useCallback(async () => {
    if (!idToken) {
      setNotificationCount(0);
      return;
    }
    try {
      const res = await fetch("/api/v1/notifications/unread-count", {
        headers: { Authorization: `Bearer ${idToken}` },
      });
      if (res.ok) {
        const data = await res.json();
        setNotificationCount(data.count ?? 0);
      }
    } catch {
      // Ignore network errors on polling
    }
  }, [idToken]);

  useEffect(() => {
    fetchUnreadCount();
    // Refresh count periodically (every 30 seconds)
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  const navItems = [
    { href: "/", icon: Home, label: t('home') },
    { href: "/messages", icon: MessageSquare, label: t('messages') },
    { href: "/search", icon: Search, label: t('search') },
    { href: "/notifications", icon: Bell, label: t('notifications') },
    {
      href: loading || !firebaseUser ? "/login" : `/profile/${firebaseUser.uid}`,
      icon: User,
      label: t('profile'),
    },
  ];

  return (
    <div className="md:hidden fixed bottom-3 left-3 right-3 h-16 glass-dock rounded-2xl border border-white/10 shadow-2xl z-50 overflow-hidden">
      <nav className="flex justify-around items-center h-full px-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-muted-foreground transition-all duration-300 relative group",
                isActive
                  ? "text-primary font-bold scale-110 bg-primary/10"
                  : "hover:text-foreground hover:bg-white/5 active:scale-95"
              )}
              aria-label={label}
            >
              <Icon className="h-5 w-5 transition-transform group-hover:scale-110" />
              {label === t('notifications') && notificationCount > 0 && (
                <span className="absolute top-1.5 right-2 h-4 w-4 text-[10px] font-bold bg-rose-500 text-white rounded-full flex items-center justify-center shadow-sm shadow-rose-500/50 animate-pulse">
                  {notificationCount > 9 ? '৯+' : notificationCount.toLocaleString(locale as string)}
                </span>
              )}
            </Link>
          );
        })}
        <div className="flex flex-col items-center justify-center p-1.5 rounded-xl text-muted-foreground hover:bg-white/5 transition-colors">
          <LanguageSwitcher as="button" />
        </div>
      </nav>
    </div>
  );
}
