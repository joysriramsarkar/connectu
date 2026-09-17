"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Home,
  MessageSquare,
  User,
  Bell,
  PlusSquare,
  Rss,
  LogOut,
  Loader2,
  Search,
  Bookmark,
  Sparkles,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { CreatePost } from "./create-post";
import { useI18n } from "@/context/i18n";
import { LanguageSwitcher } from "./language-switcher";
import { useAuth } from "@/context/auth";

const MainNav = ({
  userId,
  loading,
  notificationCount,
}: {
  userId: string | null;
  loading: boolean;
  notificationCount: number;
}) => {
  const pathname = usePathname();
  const { t } = useI18n();

  const navItems = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/messages", label: t("messages"), icon: MessageSquare },
    { href: "/notifications", label: t("notifications"), icon: Bell },
    { href: "/bookmarks", label: "সংরক্ষিত", icon: Bookmark },
    {
      href: loading ? "#" : userId ? `/profile/${userId}` : "/login",
      label: t("profile"),
      icon: User,
    },
  ];

  return (
    <nav className="flex flex-col items-start gap-1.5 w-full">
      {navItems.map(({ href, label, icon: Icon }) => {
        const isActive = pathname === href && !loading;
        return (
          <Link
            key={label}
            href={href}
            className={cn(
              "group relative flex items-center gap-3.5 rounded-2xl px-4 py-3 text-base font-medium transition-all duration-250 w-full",
              isActive
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/25 font-semibold"
                : "text-foreground/80 hover:bg-secondary/70 hover:text-foreground hover:translate-x-1",
              loading && label === t("profile") && "cursor-not-allowed opacity-50",
            )}
          >
            <div
              className={cn(
                "flex items-center justify-center transition-transform duration-200 group-hover:scale-110",
                isActive ? "text-primary-foreground" : "text-foreground/70 group-hover:text-primary",
              )}
            >
              {Icon && <Icon className="h-5.5 w-5.5" />}
            </div>
            <span className="hidden xl:inline tracking-tight">{label}</span>

            {/* Notification Badge with spring ping */}
            {label === t("notifications") && notificationCount > 0 && (
              <span className="absolute right-3 top-1/2 -translate-y-1/2 hidden xl:flex h-5 min-w-5 px-1.5 text-xs font-bold bg-destructive text-destructive-foreground rounded-full items-center justify-center shadow-sm animate-pulse">
                {notificationCount > 9 ? "৯+" : notificationCount.toLocaleString("bn-BD")}
              </span>
            )}
            {label === t("notifications") && notificationCount > 0 && (
              <span className="absolute top-2 right-2 xl:hidden h-2.5 w-2.5 bg-destructive rounded-full ring-2 ring-background animate-ping" />
            )}
          </Link>
        );
      })}
    </nav>
  );
};

export function Sidebar() {
  const { firebaseUser, appUser, idToken, loading, signOut } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);

  useEffect(() => {
    if (!idToken) {
      setNotificationCount(0);
      return;
    }
    async function fetchUnread() {
      try {
        const res = await fetch("/api/v1/notifications/unread-count", {
          headers: { Authorization: `Bearer ${idToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setNotificationCount(data.count ?? 0);
        }
      } catch {}
    }
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [idToken]);

  const handleLogout = async () => {
    try {
      await signOut();
      router.push("/login");
      toast({
        title: t("logout_success_title"),
        description: t("logout_success_description"),
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("logout_error_description"),
      });
    }
  };

  return (
    <aside className="sticky top-0 h-screen md:w-20 xl:w-72 flex-col justify-between p-4 glass-dock hidden md:flex z-30 transition-all duration-300">
      <div className="flex flex-col h-full justify-between">
        <div className="space-y-6">
          {/* Brand Header */}
          <div className="flex items-center gap-2 justify-between xl:justify-start px-2">
            <Link href="/" className="flex items-center gap-3 group">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary via-primary/90 to-accent text-primary-foreground shadow-md shadow-primary/30 transition-all duration-300 group-hover:scale-105 group-hover:rotate-6">
                <Rss className="h-6 w-6" />
              </div>
              <div className="hidden xl:flex flex-col">
                <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
                  ConnectU
                </h1>
                <span className="text-[11px] font-medium text-muted-foreground -mt-1 flex items-center gap-1">
                  <Sparkles className="h-2.5 w-2.5 text-primary" /> সোশ্যাল নেটওয়ার্ক
                </span>
              </div>
            </Link>
            <div className="hidden xl:block">
              <LanguageSwitcher />
            </div>
          </div>

          {/* Navigation Links */}
          <MainNav
            userId={firebaseUser?.uid || null}
            loading={loading}
            notificationCount={notificationCount}
          />

          {/* Create Post Button with Glow */}
          {appUser && (
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
              <DialogTrigger asChild>
                <div className="pt-2">
                  <Button className="w-full rounded-2xl py-6 font-bold text-base shadow-lg shadow-primary/25 bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground transition-all duration-300 hover:scale-[1.02] hover:shadow-primary/40 active:scale-[0.98] hidden xl:flex items-center justify-center gap-2">
                    <PlusSquare className="h-5 w-5" />
                    <span>{t("post_button")}</span>
                  </Button>
                  <div className="xl:hidden flex justify-center">
                    <Button
                      size="icon"
                      className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-accent shadow-md shadow-primary/25 hover:scale-105"
                    >
                      <PlusSquare className="h-6 w-6 text-primary-foreground" />
                    </Button>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px] border-border/60 bg-card/90 backdrop-blur-2xl">
                <DialogHeader>
                  <DialogTitle>{t("create_new_post")}</DialogTitle>
                </DialogHeader>
                <CreatePost
                  user={appUser}
                  idToken={idToken}
                  onPostCreated={() => setIsPostDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* User Card & Logout (Compact Bottom-Left Profile) */}
        <div className="pt-2.5 border-t border-border/40">
          {loading ? (
            <div className="flex items-center justify-center py-2">
              <Loader2 className="h-4 w-4 animate-spin text-primary" />
            </div>
          ) : firebaseUser && appUser ? (
            <div className="space-y-1">
              <Link
                href={`/profile/${firebaseUser.uid}`}
                className="flex items-center gap-2.5 p-1.5 rounded-xl transition-all duration-200 hover:bg-secondary/60 group"
              >
                <div className="relative flex-shrink-0">
                  <Avatar className="h-7 w-7 ring-1 ring-primary/30 group-hover:ring-primary/60 transition-all duration-200">
                    <AvatarImage src={appUser.avatar} alt={appUser.name} className="object-cover" />
                    <AvatarFallback className="bg-primary/10 text-primary font-bold text-[10px]">
                      {appUser.name.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <span className="absolute -bottom-0.5 -right-0.5 h-2 w-2 rounded-full bg-emerald-500 ring-1 ring-background animate-pulse" />
                </div>
                <div className="hidden xl:flex flex-col min-w-0 flex-1">
                  <p className="font-semibold text-xs truncate text-foreground group-hover:text-primary transition-colors leading-tight">
                    {appUser.name}
                  </p>
                  <p className="text-[10px] text-muted-foreground truncate font-medium">
                    @{appUser.handle}
                  </p>
                </div>
              </Link>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="w-full flex items-center gap-2 justify-center xl:justify-start rounded-lg px-2 h-7 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
              >
                <LogOut className="h-3.5 w-3.5" />
                <span className="hidden xl:inline font-medium text-xs">{t("logout")}</span>
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </aside>
  );
}
