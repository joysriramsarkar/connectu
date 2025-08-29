
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { signInWithEmailAndPassword, signInWithRedirect, getRedirectResult, signInAnonymously } from 'firebase/auth';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Rss, User as UserIcon } from 'lucide-react';

// A simple SVG for the Google icon
const GoogleIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
        <path d="M22 12c0-5.52-4.48-10-10-10S2 6.48 2 12c0 4.84 3.44 8.87 8 9.8V15H8v-3h2V9.5C10 7.57 11.57 6 13.5 6H16v3h-1.5c-.83 0-1.5.67-1.5 1.5V12h3l-.5 3h-2.5v6.8c4.56-.93 8-4.96 8-9.8z"/>
        <path d="M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z" fill="#4285F4"/>
        <path d="M12 22c-3.038 0-5.788-1.46-7.584-3.725l2.4-1.802A3.998 3.998 0 0112 18c2.206 0 4-1.794 4-4s-1.794-4-4-4c-1.103 0-2.096.447-2.828 1.172L12 14h6a8 8 0 00-8-8c-2.42 0-4.605.975-6.22 2.572l-2.4-1.802A9.998 9.998 0 0112 2c5.523 0 10 4.477 10 10s-4.477 10-10 10z" fill="#34A853"/>
        <path d="M12 22a9.998 9.998 0 01-7.584-3.725L2.614 16.47A9.957 9.957 0 012 12c0-2.42.975-4.605 2.572-6.22L6.974 4.38A7.96 7.96 0 004 10c0 2.206 1.794 4 4 4s4-1.794 4-4c0-.594-.132-1.155-.37-1.666L18.37 2.614A9.957 9.957 0 0122 12c0 3.038-1.46 5.788-3.725 7.584l-1.802-2.4A3.998 3.998 0 0112 18c-2.206 0-4-1.794-4-4s1.794-4 4-4c.594 0 1.155.132 1.666.37l2.4-1.802A9.957 9.957 0 0012 2 9.998 9.998 0 002.416 5.725L4.218 8.127A5.988 5.988 0 0112 6c3.309 0 6 2.691 6 6s-2.691 6-6 6z" fill="#FBBC05"/>
        <path d="M12 22a9.998 9.998 0 01-7.584-3.725l2.4-1.802A3.998 3.998 0 0112 18c2.206 0 4-1.794 4-4s-1.794-4-4-4c-1.103 0-2.096.447-2.828 1.172L12 14h6a8 8 0 00-8-8c-2.42 0-4.605.975-6.22 2.572L3.725 4.416A9.998 9.998 0 0112 2c5.523 0 10 4.477 10 10s-4.477 10-10 10z" fill="#EA4335"/>
    </svg>
);

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [anonymousLoading, setAnonymousLoading] = useState(false);
  const [checkingRedirect, setCheckingRedirect] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
  const router = useRouter();
  const { toast } = useToast();
  
  useEffect(() => {
    setIsMounted(true);
    const checkRedirect = async () => {
        try {
            const result = await getRedirectResult(auth);
            if (result) {
                toast({
                    title: "সফল!",
                    description: "আপনি Google দিয়ে সফলভাবে লগ ইন করেছেন।",
                });
                router.push('/');
            }
        } catch (error: any) {
            console.error("Google sign-in error after redirect:", error);
            toast({
                variant: "destructive",
                title: "ত্রুটি",
                description: error.message || "Google দিয়ে লগইন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
            });
        } finally {
            setCheckingRedirect(false);
        }
    };
    checkRedirect();
  }, [router, toast]);


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast({
        title: "সফল!",
        description: "আপনি সফলভাবে লগ ইন করেছেন।",
      });
      router.push('/');
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: "ত্রুটি",
        description: error.message || "লগইন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
        await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "ত্রুটি",
            description: error.message || "Google দিয়ে লগইন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        });
        setGoogleLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setAnonymousLoading(true);
    try {
        await signInAnonymously(auth);
        toast({
            title: "সফল!",
            description: "আপনি বেনামে সফলভাবে লগ ইন করেছেন।",
        });
        router.push('/');
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: "ত্রুটি",
            description: error.message || "বেনামে লগইন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।",
        });
    } finally {
        setAnonymousLoading(false);
    }
  };
  
  if (!isMounted || checkingRedirect) {
    return (
        <div className="flex items-center justify-center min-h-screen bg-background">
            <Loader2 className="h-16 w-16 animate-spin text-primary" />
        </div>
    );
  }

  const isAnyLoading = loading || googleLoading || anonymousLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <Rss className="h-12 w-12 mx-auto text-primary" />
          <CardTitle className="text-2xl">ConnectU-তে লগ ইন করুন</CardTitle>
          <CardDescription>
            আপনার অ্যাকাউন্টে প্রবেশ করতে ইমেল এবং পাসওয়ার্ড লিখুন
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            <form onSubmit={handleLogin} className="grid gap-4">
              <div className="grid gap-2">
                <Label htmlFor="email">ইমেল</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <div className="grid gap-2">
                <div className="flex items-center">
                  <Label htmlFor="password">পাসওয়ার্ড</Label>
                  <Link href="#" className="ml-auto inline-block text-sm underline">
                    পাসওয়ার্ড ভুলে গেছেন?
                  </Link>
                </div>
                <Input 
                  id="password" 
                  type="password" 
                  required 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isAnyLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isAnyLoading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {loading ? "লগ ইন করা হচ্ছে..." : "লগ ইন"}
              </Button>
            </form>
             <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    অথবা চালিয়ে যান
                    </span>
                </div>
            </div>
             <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isAnyLoading}>
                {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                Google দিয়ে লগইন করুন
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleAnonymousSignIn} disabled={isAnyLoading}>
                {anonymousLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserIcon className="mr-2 h-4 w-4" />}
                অতিথি হিসেবে চালিয়ে যান
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            কোনো অ্যাকাউন্ট নেই?{" "}
            <Link href="/signup" className="underline">
              সাইন আপ করুন
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

    