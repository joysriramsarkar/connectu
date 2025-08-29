
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
import { doc, getDoc } from "firebase/firestore";

async function getUserProfile(userId: string): Promise<AppUser | null> {
  if (!userId) return null;
  const userDocRef = doc(db, "users", userId);
  const userDoc = await getDoc(userDocRef);
  if (userDoc.exists()) {
    return { id: userDoc.id, ...userDoc.data() } as AppUser;
  }
  return null;
}

const MainNav = ({ userId, loading }: { userId: string | null, loading: boolean }) => {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/", label: "হোম", icon: Home },
    { href: "/search", label: "অনুসন্ধান", icon: Search },
    { href: "/messages", label: "বার্তা", icon: MessageSquare },
    { href: "/notifications", label: "বিজ্ঞপ্তি", icon: Bell },
    { href: loading ? "#" : (userId ? `/profile/${userId}` : "/login"), label: "প্রোফাইল", icon: User },
  ];

  return (
    <nav className="flex flex-col items-start gap-2">
      {navItems.map(({ href, label, icon: Icon }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            "flex items-center gap-3 rounded-full px-4 py-2 text-lg transition-colors hover:bg-accent/50 w-full",
            pathname === href && !loading ? "font-bold" : "font-normal",
            loading && label === "প্রোফাইল" && "cursor-not-allowed opacity-50"
          )}
        >
          <Icon className="h-6 w-6" />
          <span className="hidden xl:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
};

export function Sidebar() {
  const router = useRouter();
  const { toast } = useToast();
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPostDialogOpen, setIsPostDialogOpen] = useState(false);

  useEffect(() => {
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


  const handleLogout = async () => {
    try {
      await auth.signOut();
      router.push('/login');
      toast({
        title: "সাফল্য!",
        description: "আপনি সফলভাবে লগ আউট করেছেন।",
      });
    } catch (error) {
      console.error("Error signing out: ", error);
      toast({
        variant: "destructive",
        title: "ত্রুটি",
        description: "লগ আউট করার সময় একটি সমস্যা হয়েছে।",
      });
    }
  };


  return (
    <aside className="sticky top-0 h-screen md:w-20 xl:w-64 flex-col justify-between p-4 border-r border-border hidden md:flex">
      <div className="flex flex-col h-full">
        <Link href="/" className="mb-4 flex items-center gap-2 justify-center xl:justify-start">
            <Rss className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold hidden xl:inline">ConnectU</h1>
        </Link>
        <MainNav userId={firebaseUser?.uid || null} loading={loading} />
        
        {appUser && (
            <Dialog open={isPostDialogOpen} onOpenChange={setIsPostDialogOpen}>
              <DialogTrigger asChild>
                <div className="mt-4">
                  <div className="hidden xl:block">
                     <Button className="w-full rounded-full py-6 text-lg">
                        পোস্ট করুন
                    </Button>
                  </div>
                   <div className="xl:hidden">
                        <Button size="icon" className="w-12 h-12 rounded-full">
                            <PlusSquare />
                        </Button>
                    </div>
                </div>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[625px]">
                <DialogHeader>
                  <DialogTitle>নতুন পোস্ট তৈরি করুন</DialogTitle>
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
                        <span className="hidden xl:inline">লগ আউট</span>
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
