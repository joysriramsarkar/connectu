
"use client";

import { useState, useEffect } from 'react';
import Link from "next/link";
import { useRouter } from 'next/navigation';
import { signIn } from "next-auth/react";
import { signInWithEmailAndPassword, signInWithPopup, signInAnonymously, onAuthStateChanged, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from 'firebase/auth';
import { FirebaseError } from 'firebase/app';
import { auth, googleProvider } from '@/lib/firebase';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from '@/hooks/use-toast';
import { Loader2, Rss, User as UserIcon, Phone } from 'lucide-react';
import { useI18n } from '@/context/i18n';

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
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [anonymousLoading, setAnonymousLoading] = useState(false);
  const [phoneLoading, setPhoneLoading] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [authMethod, setAuthMethod] = useState<'email' | 'phone'>('email');
  const [phoneAuthStep, setPhoneAuthStep] = useState<'enterPhone' | 'enterOtp'>('enterPhone');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  
  const router = useRouter();
  const { toast } = useToast();
  const { t } = useI18n();

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!auth) return;
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const idToken = await user.getIdToken();
        await signIn("credentials", { idToken });
        
        toast({
          title: t('success_title'),
          description: t('login_success'),
        });
        router.push('/');
      }
    });
    return () => unsubscribe();
  }, [router, toast, t]);
  
  const setupRecaptcha = () => {
    if (!isClient || !auth) return null;
    if (!(window as any).recaptchaVerifier) {
        (window as any).recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
            'size': 'invisible',
            'callback': () => {
              // reCAPTCHA solved, allow signInWithPhoneNumber.
            }
        });
    }
    return (window as any).recaptchaVerifier;
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: error.message || t('login_failed'),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (!auth || !googleProvider) return;
    setGoogleLoading(true);
    try {
        await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
        if (error.code !== 'auth/popup-closed-by-user') {
            console.error(error);
            toast({
                variant: "destructive",
                title: t('error_title'),
                description: t('google_login_failed'),
            });
        }
    } finally {
        setGoogleLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    if (!auth) return;
    setAnonymousLoading(true);
    try {
        await signInAnonymously(auth);
    } catch (error: any) {
        console.error(error);
        toast({
            variant: "destructive",
            title: t('error_title'),
            description: error.message || t('anonymous_login_failed'),
        });
    } finally {
        setAnonymousLoading(false);
    }
  };

  const handlePhoneSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth) return;
    setPhoneLoading(true);
    const appVerifier = setupRecaptcha();
    if (!appVerifier) {
        toast({
            variant: "destructive",
            title: t('error_title'),
            description: t('recaptcha_load_failed'),
        });
        setPhoneLoading(false);
        return;
    }
    try {
      const result = await signInWithPhoneNumber(auth, `+${phone}`, appVerifier);
      setConfirmationResult(result);
      setPhoneAuthStep('enterOtp');
      toast({
        title: t('otp_sent_title'),
        description: `${t('otp_sent_description')} +${phone}`,
      });
    } catch (error: any) {
        console.error(error);
        let description = t('otp_send_failed');
        if (error.code === 'auth/billing-not-enabled') {
            description = t('firebase_billing_not_enabled');
        } else if (error.message) {
            description = error.message;
        }
        toast({
            variant: "destructive",
            title: t('error_title'),
            description: description,
        });
    } finally {
      setPhoneLoading(false);
    }
  };

  const handleOtpVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!confirmationResult) return;
    setPhoneLoading(true);
    try {
      await confirmationResult.confirm(otp);
      // Auth state change will handle redirect
    } catch (error: any) {
      console.error(error);
      toast({
        variant: "destructive",
        title: t('error_title'),
        description: error.message || t('wrong_otp'),
      });
    } finally {
      setPhoneLoading(false);
    }
  };

  if (!isClient) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Loader2 className="h-16 w-16 animate-spin" />
      </div>
    );
  }

  const isAnyLoading = loading || googleLoading || anonymousLoading || phoneLoading;

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div id="recaptcha-container"></div>
      <Card className="mx-auto max-w-sm w-full">
        <CardHeader className="text-center">
            <Rss className="h-12 w-12 mx-auto text-primary" />
          <CardTitle className="text-2xl">{t('login_to_connectu')}</CardTitle>
          <CardDescription>
            {authMethod === 'email' ? t('enter_email_password') : t('use_phone_to_login')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {authMethod === 'email' ? (
                <form onSubmit={handleLogin} className="grid gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="email">{t('email')}</Label>
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
                      <Label htmlFor="password">{t('password')}</Label>
                      <Link href="#" className="ml-auto inline-block text-sm underline">
                        {t('forgot_password')}
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
                    {loading ? t('logging_in') : t('login')}
                  </Button>
                </form>
            ) : phoneAuthStep === 'enterPhone' ? (
                <form onSubmit={handlePhoneSignIn} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="phone">{t('phone_number_with_code')}</Label>
                        <Input
                        id="phone"
                        type="tel"
                        placeholder="8801712345678"
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        disabled={isAnyLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isAnyLoading}>
                        {phoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {phoneLoading ? t('sending_otp') : t('send_otp')}
                    </Button>
                </form>
            ) : (
                <form onSubmit={handleOtpVerify} className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="otp">{t('otp')}</Label>
                        <Input
                        id="otp"
                        type="text"
                        placeholder="123456"
                        required
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        disabled={isAnyLoading}
                        />
                    </div>
                    <Button type="submit" className="w-full" disabled={isAnyLoading}>
                        {phoneLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        {phoneLoading ? t('verifying') : t('verify_and_login')}
                    </Button>
                </form>
            )}

            <div className="relative">
                <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-background px-2 text-muted-foreground">
                    {t('or_continue_with')}
                    </span>
                </div>
            </div>

            {authMethod === 'phone' ? (
                <Button variant="outline" className="w-full" onClick={() => setAuthMethod('email')} disabled={isAnyLoading}>
                    {t('login_with_email')}
                </Button>
            ) : (
                 <Button variant="outline" className="w-full" onClick={() => { setAuthMethod('phone'); setPhoneAuthStep('enterPhone'); }} disabled={isAnyLoading}>
                    <Phone className="mr-2 h-4 w-4" />
                    {t('login_with_phone')}
                </Button>
            )}
             
            <Button variant="outline" className="w-full" onClick={handleGoogleSignIn} disabled={isAnyLoading}>
                {googleLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <GoogleIcon className="mr-2 h-4 w-4" />}
                {t('login_with_google')}
            </Button>
            <Button variant="secondary" className="w-full" onClick={handleAnonymousSignIn} disabled={isAnyLoading}>
                {anonymousLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UserIcon className="mr-2 h-4 w-4" />}
                {t('continue_as_guest')}
            </Button>
          </div>
          <div className="mt-4 text-center text-sm">
            {t('no_account')}{" "}
            <Link href="/signup" className="underline">
              {t('signup')}
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
