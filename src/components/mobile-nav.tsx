
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { cn } from "@/lib/utils";
import { Home, MessageSquare, User, Bell, Search } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export function MobileNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;
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
    { href: "/", icon: Home, label: 'হোম' },
    { href: "/messages", icon: MessageSquare, label: 'বার্তা' },
    { href: "/search", icon: Search, label: 'অনুসন্ধান' },
    { href: "/notifications", icon: Bell, label: 'বিজ্ঞপ্তি' },
    { href: loading || !user ? "/login" : `/profile/${user.uid}`, icon: User, label: 'প্রোফাইল' },
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
            {label === 'বিজ্ঞপ্তি' && notificationCount > 0 && (
                 <span className="absolute top-1 right-1/2 translate-x-[20px] h-4 w-4 text-xs bg-red-500 text-white rounded-full flex items-center justify-center">
                    {(notificationCount > 9 ? '৯+' : notificationCount.toLocaleString('bn-BD'))}
                 </span>
            )}
          </Link>
        ))}
      </nav>
    </div>
  );
};
