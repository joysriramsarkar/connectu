
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { cn } from "@/lib/utils";
import { Home, MessageSquare, User, Bell, Search } from "lucide-react";
import { auth } from "@/lib/firebase";

export function MobileNav() {
  const pathname = usePathname();
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

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
              "flex flex-col items-center justify-center w-full h-full text-muted-foreground transition-colors",
              pathname === href ? "text-primary font-bold" : ""
            )}
            aria-label={label}
          >
            <Icon className="h-6 w-6" />
          </Link>
        ))}
      </nav>
    </div>
  );
};
