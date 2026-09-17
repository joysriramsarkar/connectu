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
import { Loader2, Rss, Sparkles, LogIn, KeyRound } from "lucide-react";
import { useI18n } from "@/context/i18n";
import { useAuth } from "@/context/auth";

export default function LoginPage() {
  const [emailOrHandle, setEmailOrHandle] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();
  const { user, login } = useAuth();

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      router.replace("/");
    }
  }, [user, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!emailOrHandle.trim() || !password) {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("enter_email_password"),
      });
      return;
    }

    setLoading(true);
    try {
      const result = await login(emailOrHandle.trim(), password);
      if (result.success) {
        toast({
          title: t("success_title"),
          description: t("login_success"),
        });
        router.push("/");
      } else {
        toast({
          variant: "destructive",
          title: t("error_title"),
          description: result.error || t("login_failed"),
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: t("error_title"),
        description: t("login_failed"),
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
            <Sparkles className="h-3 w-3 text-primary animate-spin" /> স্বাগত জানাচ্ছি ConnectU-তে
          </p>
        </div>
      </div>

      <Card className="relative z-10 w-full max-w-md border border-white/20 dark:border-white/10 shadow-2xl bg-card/75 backdrop-blur-2xl transition-all duration-300 hover:shadow-primary/10">
        <CardHeader className="text-center space-y-1 pb-4">
          <div className="mx-auto mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
            <KeyRound className="h-5 w-5" />
          </div>
          <CardTitle className="text-2xl font-bold tracking-tight">
            {t("login_to_connectu")}
          </CardTitle>
          <CardDescription className="text-sm">
            {t("enter_email_password")}
          </CardDescription>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                ইউজারনেম অথবা ইমেল
              </Label>
              <Input
                id="email"
                type="text"
                placeholder="যেমন: joysriramsarkar অথবা email"
                value={emailOrHandle}
                onChange={(e) => setEmailOrHandle(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t("password")}
                </Label>
              </div>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                className="h-11 rounded-xl bg-background/60 backdrop-blur-sm border-border/80 focus-visible:ring-2 focus-visible:ring-primary/50 transition-all duration-200"
              />
            </div>

            <Button
              type="submit"
              className="w-full h-11.5 font-semibold text-base rounded-xl shadow-lg shadow-primary/20 bg-gradient-to-r from-primary via-primary/90 to-accent text-primary-foreground transition-all duration-300 hover:scale-[1.01] hover:shadow-primary/35 active:scale-[0.99] mt-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("logging_in")}
                </>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  <LogIn className="h-4 w-4" /> {t("login")}
                </span>
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-muted-foreground">
            {t("no_account")}{" "}
            <Link
              href="/signup"
              className="font-semibold text-primary hover:underline underline-offset-4"
            >
              {t("signup")}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
