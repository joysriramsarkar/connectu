
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { cn } from "@/lib/utils";
import { Home, MessageSquare, User, Bell, Search, Languages } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useI18n } from "@/context/i18n";
import { LanguageSwitcher } from "./language-switcher";

export function MobileNav() {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user || !db) return;
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", user.uid),
        where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotificationCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  const navItems = [
    { href: "/", icon: Home, label: t('home') },
    { href: "/messages", icon: MessageSquare, label: t('messages') },
    { href: "/search", icon: Search, label: t('search') },
    { href: "/notifications", icon: Bell, label: t('notifications') },
    { href: loading || !user ? "/login" : `/profile/${user.uid}`, icon: User, label: t('profile') },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-background border-t border-border z-50">
      <nav className="flex justify-around items-center h-full">
        {navItems.map(({ href, icon: Icon, label }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full text-muted-foreground transition-colors relative",
              pathname === href ? "text-primary font-bold" : ""
            )}
            aria-label={label}
          >
            <Icon className="h-6 w-6" />
            {label === t('notifications') && notificationCount > 0 && (
                 <span className="absolute top-1 right-1/2 translate-x-[20px] h-4 w-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {(notificationCount > 9 ? '৯+' : notificationCount.toLocaleString(locale as string))}
                 </span>
            )}
          </Link>
        ))}
         <div className="flex flex-col items-center justify-center w-full h-full text-muted-foreground">
            <LanguageSwitcher as="button" />
        </div>
      </nav>
    </div>
  );
};
