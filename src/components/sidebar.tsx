
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, User, Bell, PlusSquare, Rss, LogOut, Loader2, Search } from "lucide-react";
import { auth, db } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { CreatePost } from "./create-post";
import { User as AppUser } from "@/lib/data";
import { doc, getDoc, collection, query, where, onSnapshot } from "firebase/firestore";
import { useI18n } from "@/context/i18n";
import { LanguageSwitcher } from "./language-switcher";

async function getUserProfile(userId: string): Promise<AppUser | null> {
  if (!userId || !db) return null;
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
  }
  return null;
}

const MainNav = ({ userId, loading, notificationCount }: { userId: string | null, loading: boolean, notificationCount: number }) => {
  const pathname = usePathname();
  const { t, locale } = useI18n();
  
  const navItems = [
    { href: "/", label: t("home"), icon: Home },
    { href: "/search", label: t("search"), icon: Search },
    { href: "/messages", label: t("messages"), icon: MessageSquare },
    { href: "/notifications", label: t("notifications"), icon: Bell },
    { href: loading ? "#" : (userId ? `/profile/${userId}` : "/login"), label: t("profile"), icon: User },
  ];

  return (
    <nav className="flex flex-col items-start gap-2">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-full px-4 py-2 text-lg transition-colors hover:bg-accent/50 w-full relative",
            pathname === href && !loading ? "font-bold" : "font-normal",
            loading && label === t("profile") && "cursor-not-allowed opacity-50"
          )}
        >
          {Icon && <Icon className="h-6 w-6" />}
          <span className="hidden xl:inline">{label}</span>
          {label === t('notifications') && notificationCount > 0 && (
            <>
              <span className="absolute left-8 top-1 hidden xl:flex h-5 w-5 text-xs bg-red-500 text-white rounded-full items-center justify-center">
                  {(notificationCount > 9 ? `৯+` : notificationCount.toLocaleString('bn-BD'))}
              </span>
              <span className="absolute left-2 top-1 xl:hidden h-2 w-2 bg-red-500 rounded-full"></span>
            </>
          )}
        </Link>
      ))}
    </nav>
  );
};

export function Sidebar() {
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);


  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setFirebaseUser(currentUser);
      if (currentUser) {
        const profile = await getUserProfile(currentUser.uid);
        setAppUser(profile);
      } else {
        setAppUser(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!firebaseUser || !db) return;
    const q = query(
        collection(db, "notifications"),
        where("recipientId", "==", firebaseUser.uid),
        where("read", "==", false)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setNotificationCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [firebaseUser]);


  const handleLogout = async () => {
    if (!auth) return;
    try {
      await auth.signOut();
      router.push('/login');
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
    <aside className="sticky top-0 h-screen md:w-20 xl:w-64 flex-col justify-between p-4 border-r border-border hidden md:flex">
      <div className="flex flex-col h-full">
        <div className="mb-4 flex items-center gap-2 justify-between xl:justify-start">
            <Link href="/" className="flex items-center gap-2">
                <Rss className="h-8 w-8 text-primary" />
                <h1 className="text-2xl font-bold hidden xl:inline">ConnectU</h1>
            </Link>
            <div className="hidden xl:block">
                <LanguageSwitcher />
            </div>
        </div>
        <MainNav userId={firebaseUser?.uid || null} loading={loading} notificationCount={notificationCount} />
        
        {appUser && (
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
              <DialogTrigger asChild>
                <div className="mt-4">
                  <Button className="w-full rounded-full py-6 text-lg hidden xl:flex items-center justify-center">
                    {t('post_button')}
                  </Button>
                  <div className="xl:hidden">
                    <Button size="icon" className="w-12 h-12 rounded-full">
                        <PlusSquare />
                    </Button>
                  </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>{t('create_new_post')}</DialogTitle>
                </DialogHeader>
                <CreatePost user={appUser} onPostCreated={() => setIsPostDialogOpen(false)} />
              </DialogContent>
            </Dialog>
        )}

        <div className="flex-grow"></div>

        <div className="flex flex-col gap-4">
            {loading ? (
                <div className="flex items-center justify-center py-2">
                    <Loader2 className="h-6 w-6 animate-spin" />
                </div>
            ) : firebaseUser && appUser ? (
                <>
                    <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-3 justify-center xl:justify-start rounded-full px-4 py-2 text-lg">
                        <LogOut className="h-6 w-6" />
                        <span className="hidden xl:inline">{t('logout')}</span>
                    </Button>
                    <Link href={`/profile/${firebaseUser.uid}`} className="flex items-center gap-3 justify-center xl:justify-start">
                      <Avatar>
                      <AvatarImage src={appUser.avatar} alt={appUser.name} />
                      <AvatarFallback>{appUser.name.substring(0, 2)}</AvatarFallback>
                      </Avatar>
                      <div className="hidden xl:inline">
                          <p className="font-bold truncate">{appUser.name}</p>
                          <p className="text-sm text-muted-foreground truncate">@{appUser.handle}</p>
                      </div>
                    </Link>
                </>
            ): null}
        </div>
      </div>
    </aside>
  );
}
