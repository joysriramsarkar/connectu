
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Home, MessageSquare, User, Bell, PlusSquare, Rss, LogOut, Loader2 } from "lucide-react";
import { auth } from "@/lib/firebase";
import { useToast } from "@/hooks/use-toast";


const MainNav = ({ userId, loading }: { userId: string | null, loading: boolean }) => {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/", label: "হোম", icon: Home },
    { href: "/messages", label: "বার্তা", icon: MessageSquare },
    { href: loading ? "#" : (userId ? `/profile/${userId}` : "/login"), label: "প্রোফাইল", icon: User },
    { href: "#", label: "বিজ্ঞপ্তি", icon: Bell },
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
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
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
    <aside className="sticky top-0 h-screen w-20 xl:w-64 flex flex-col justify-between p-4 border-r border-border">
      <div>
        <Link href="/" className="mb-8 flex items-center gap-2 justify-center xl:justify-start">
            <Rss className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold hidden xl:inline">ConnectU</h1>
        </Link>
        <MainNav userId={user?.uid || null} loading={loading} />
        <Button className="mt-6 w-full rounded-full py-6 text-lg hidden xl:block">
            পোস্ট করুন
        </Button>
        <Button size="icon" className="mt-6 w-12 h-12 rounded-full xl:hidden">
            <PlusSquare />
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        {user && 
            <Button variant="ghost" onClick={handleLogout} className="flex items-center gap-3 justify-center xl:justify-start rounded-full px-4 py-2 text-lg">
                <LogOut className="h-6 w-6" />
                <span className="hidden xl:inline">লগ আউট</span>
            </Button>
        }
        {loading ? (
            <div className="flex items-center justify-center py-2">
                <Loader2 className="h-6 w-6 animate-spin" />
            </div>
        ) : user && (
           <div className="flex items-center gap-3 justify-center xl:justify-start">
              <Link href={`/profile/${user.uid}`}>
                  <Avatar>
                  <AvatarImage src={user.photoURL || "https://picsum.photos/seed/user-placeholder/200"} alt={user.displayName || "User"} />
                  <AvatarFallback>{user.displayName?.substring(0, 2) || 'U'}</AvatarFallback>
                  </Avatar>
              </Link>
              <div className="hidden xl:inline">
                  <p className="font-bold truncate">{user.displayName || "User"}</p>
                  <p className="text-sm text-muted-foreground truncate">{user.email}</p>
              </div>
           </div>
        )}
      </div>
    </aside>
  );
}
