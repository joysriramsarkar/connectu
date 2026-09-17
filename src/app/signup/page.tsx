"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Rss, Sparkles, ShieldCheck, UserCheck } from "lucide-react";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/context/auth";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [handle, setHandle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const { user, signup } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: "অনুগ্রহ করে আপনার পুরো নাম লিখুন।",
      });
      return;
    }

    if (!handle.trim() || !/^[a-zA-Z0-9_]{3,30}$/.test(handle.trim())) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: "হ্যান্ডেল ৩-৩০ টি বর্ণ বা সংখ্যা হতে হবে (যেমন: joy_123)।",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: "পাসওয়ার্ড অন্তত ৬ অক্ষরের হতে হবে।",
      });
      return;
    }

    if (password !== confirmPassword) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("passwords_do_not_match"),
      });
      return;
    }

    setLoading(true);
    try {
      const result = await signup({
        name: name.trim(),
        handle: handle.trim().toLowerCase(),
        email: email.trim() ? email.trim().toLowerCase() : undefined,
        password,
      });

      if (result.success) {
        toast({
          title: t("success_title"),
          description: t("account_created_success"),
        });
        router.push("/");
      } else {
        toast({
          variant: "destructive",
          title: t("error_title"),
          description: result.error || t("signup_failed"),
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("signup_failed"),
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-gradient-to-br from-background via-muted/30 to-background px-4 py-10">
      {/* Dynamic Animated Ambient Background Orbs */}
      <div className="pointer-events-none absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-[100px] animate-pulse" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-accent/25 blur-[120px] animate-pulse delay-1000" />
      <div className="pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-80 w-80 rounded-full bg-primary/10 blur-[90px]" />

      <div className="relative z-10 mb-6 flex items-center gap-3 animate-fade-in">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-tr from-primary to-accent text-primary-foreground shadow-lg shadow-primary/25 ring-4 ring-primary/20 transition-transform duration-300 hover:scale-105 hover:rotate-3">
          <Rss className="h-6 w-6" />
        </div>
        <div>
          <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-foreground via-foreground/90 to-primary bg-clip-text text-transparent">
            {t("app_name")}
          </span>
          <p className="text-xs text-muted-foreground flex items-center gap-1 font-medium">
            <Sparkles className="h-3 w-3 text-primary animate-spin" /> আধুনিক বাংলা সোশ্যাল প্ল্যাটফর্ম
          </p>
        </div>
      </div>

      <Card className="relative z-10 w-full max-w-md border border-white/20 dark:border-white/10 shadow-2xl bg-card/75 backdrop-blur-2xl transition-all duration-300 hover:shadow-primary/10">
        <CardHeader className="text-center space-y-1 pb-4">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <UserCheck className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t("join_connectu")}
          </CardTitle>
          <CardDescription className="text-sm">
            {t("enter_info_to_start")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSignup} className="space-y-3.5">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                আপনার পুরো নাম <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                type="text"
                placeholder="যেমন: জয় সরকার"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                className="h-10.5 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="handle" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ইউনিক ইউজারনেম / হ্যান্ডেল (@) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="handle"
                type="text"
                placeholder="যেমন: joysarkar"
                value={handle}
                onChange={(e) => setHandle(e.target.value)}
                required
                disabled={loading}
                className="h-10.5 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("email")}
                </Label>
                <span className="text-[11px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  ঐচ্ছিক (না দিলেও চলবে)
                </span>
              </div>
              <Input
                id="email"
                type="email"
                placeholder="example@connectu.com (ঐচ্ছিক)"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="h-10.5 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("password")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="কমপক্ষে ৬ অক্ষর"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10.5 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("confirm_password")} <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-10.5 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
                />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11.5 font-semibold text-base rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground transition-all duration-300 hover:scale-[1.01] hover:shadow-primary/35 active:scale-[0.99] mt-3"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("creating_account")}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <ShieldCheck className="h-4 w-4" /> {t("create_account")}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-5 text-center text-sm text-muted-foreground">
            {t("already_have_account")}{" "}
            <Link
              href="/login"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              {t("login")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
