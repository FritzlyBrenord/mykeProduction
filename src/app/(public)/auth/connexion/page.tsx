"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/useAuth";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  Clock3,
  Eye,
  EyeOff,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const RESEND_COOLDOWN_SECONDS = 60;

type ProfileGateRow = {
  role: "admin" | "client" | null;
  is_active: boolean | null;
  deleted_at: string | null;
};

function formatDuration(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function normalizeNextPath(value: string | null) {
  if (!value) return null;
  if (!value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

async function resolvePostLoginPath(nextPath: string | null) {
  const safeNextPath = normalizeNextPath(nextPath);
  const supabase = createClient();
  const profiles = () => supabase.from("profiles" as any) as any;
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { target: "/", blocked: false };
  }

  const { data: profile } = (await profiles()
    .select("role,is_active,deleted_at")
    .eq("id", user.id)
    .maybeSingle()) as { data: ProfileGateRow | null };

  const isBlocked = profile
    ? profile.is_active === false || Boolean(profile.deleted_at)
    : false;
  if (isBlocked) {
    await supabase.auth.signOut();
    return { target: "/auth/connexion?blocked=1", blocked: true };
  }

  const metadataRole =
    (user.app_metadata?.role as "admin" | "client" | undefined) ??
    (user.user_metadata?.role as "admin" | "client" | undefined);
  const role = profile?.role === "admin" || metadataRole === "admin" ? "admin" : "client";

  if (role === "admin") {
    if (safeNextPath?.startsWith("/admin")) {
      return { target: safeNextPath, blocked: false };
    }
    return { target: "/admin/dashboard", blocked: false };
  }

  if (safeNextPath && !safeNextPath.startsWith("/admin")) {
    return { target: safeNextPath, blocked: false };
  }

  return { target: "/", blocked: false };
}

function LoginPageContent() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const [verificationEmail, setVerificationEmail] = useState<string | null>(null);
  const [verificationExpiresAtMs, setVerificationExpiresAtMs] = useState<number | null>(null);
  const [isResendingVerification, setIsResendingVerification] = useState(false);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);
  const [nowMs, setNowMs] = useState(Date.now());
  const {
    user,
    loading,
    signIn,
    signInWithGoogle,
    resendVerificationEmail,
    getLoginLockRemainingMs,
    getVerificationExpiryMs,
    initError,
  } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nextPath = searchParams.get("next");
  const blockedParam = searchParams.get("blocked");

  const normalizedEmail = useMemo(() => normalizeEmail(email), [email]);
  const lockoutRemainingMs = normalizedEmail ? getLoginLockRemainingMs(normalizedEmail) : 0;
  const verificationRemainingMs =
    typeof verificationExpiresAtMs === "number" ? verificationExpiresAtMs - nowMs : null;

  useEffect(() => {
    const interval = window.setInterval(() => {
      setNowMs(Date.now());
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!loading && user) {
      void (async () => {
        const { target } = await resolvePostLoginPath(nextPath);
        router.replace(target);
      })();
    }
  }, [loading, user, router, nextPath]);

  useEffect(() => {
    if (blockedParam === "1") {
      setAuthErrorMessage("Ce compte est desactive. Contactez un administrateur.");
    }
  }, [blockedParam]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage(null);

    if (lockoutRemainingMs > 0) {
      setAuthErrorMessage(
        `Connexion bloquee temporairement. Reessayez dans ${formatDuration(
          lockoutRemainingMs,
        )}.`,
      );
      toast.error("Compte bloque apres 5 tentatives.");
      return;
    }

    setIsLoading(true);

    try {
      const result = await signIn(normalizedEmail, password);

      if (result.error) {
        if (result.code === "EMAIL_NOT_VERIFIED") {
          const emailToVerify = normalizedEmail;
          setVerificationEmail(emailToVerify);
          setVerificationExpiresAtMs(
            result.verificationExpiresAtMs ?? getVerificationExpiryMs(emailToVerify) ?? null,
          );
          setAuthErrorMessage(
            "Votre email n'est pas verifie. Cliquez sur le lien recu par email avant de vous connecter.",
          );
          toast.error("Email non verifie.");
        } else if (result.code === "LOCKED_OUT") {
          const remaining = result.lockoutRemainingMs ?? lockoutRemainingMs;
          setAuthErrorMessage(
            `5 echecs detectes. Connexion suspendue 20 minutes. Temps restant: ${formatDuration(
              remaining,
            )}.`,
          );
          toast.error("Compte temporairement verrouille.");
        } else if (result.code === "INVALID_CREDENTIALS") {
          const remainingAttempts = result.remainingAttempts ?? 0;
          setAuthErrorMessage(
            `Email ou mot de passe invalide. Tentatives restantes: ${remainingAttempts}.`,
          );
          toast.error("Identifiants invalides.");
        } else if (result.code === "ACCOUNT_BLOCKED") {
          setAuthErrorMessage(
            result.message || "Ce compte est desactive. Contactez un administrateur.",
          );
          toast.error("Compte desactive.");
        } else {
          setAuthErrorMessage(result.message || "Connexion indisponible pour le moment.");
          toast.error(result.message || "Erreur de connexion.");
        }
      } else {
        setAuthErrorMessage(null);
        setVerificationEmail(null);
        setVerificationExpiresAtMs(null);

        const { target, blocked } = await resolvePostLoginPath(nextPath);
        if (blocked) {
          setAuthErrorMessage("Ce compte est desactive. Contactez un administrateur.");
          toast.error("Compte desactive.");
          router.replace(target);
          return;
        }

        toast.success("Connexion reussie.");
        router.replace(target);
        router.refresh();
      }
    } catch {
      setAuthErrorMessage("Une erreur inattendue est survenue.");
      toast.error("Une erreur est survenue.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || "Connexion Google indisponible.");
      }
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!verificationEmail || isResendingVerification || resendCooldownSeconds > 0) {
      return;
    }

    setIsResendingVerification(true);
    const result = await resendVerificationEmail(verificationEmail);

    if (result.error) {
      if (result.code === "RATE_LIMITED") {
        toast.error("Trop de demandes. Reessayez plus tard.");
      } else {
        toast.error("Echec du renvoi de verification.");
      }
    } else {
      setVerificationExpiresAtMs(
        result.verificationExpiresAtMs ??
          getVerificationExpiryMs(verificationEmail) ??
          null,
      );
      setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      toast.success("Email de verification renvoye.");
    }

    setIsResendingVerification(false);
  };

  return (
    <div className="min-h-screen flex bg-white py-20">
      {initError && (
        <div className="fixed top-0 left-0 right-0 bg-red-500 text-white p-4 z-50">
          <div className="max-w-6xl mx-auto text-center">
            <p className="font-semibold">Erreur de configuration Supabase</p>
            <p className="text-sm">{initError}</p>
            <p className="text-xs mt-1">
              Verifie tes variables d&apos;environnement dans .env.local
            </p>
          </div>
        </div>
      )}

      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950"
      >
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_rgba(245,158,11,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(245,158,11,0.1)_0%,_transparent_40%)]" />
        </div>

        <div className="absolute top-20 left-20 w-32 h-32 border border-amber-400/20 rounded-full" />
        <div className="absolute top-28 left-28 w-24 h-24 border border-amber-400/10 rounded-full" />
        <div className="absolute bottom-40 right-20 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-12 h-12 rounded-sm bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/20">
                <span className="text-slate-950 font-bold text-xl">M</span>
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-amber-400/60" />
            </div>
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-playfair)] font-semibold text-xl tracking-tight text-white">
                Myke Industrie
              </span>
              <span className="text-[10px] uppercase tracking-[0.2em] -mt-0.5 text-amber-400/80">
                Excellence Industrielle
              </span>
            </div>
          </div>

          <div className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-[family-name:var(--font-playfair)] text-4xl xl:text-5xl font-semibold text-white leading-tight"
            >
              Accedez a l&apos;excellence
              <span className="block text-amber-400">industrielle</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-slate-300 max-w-md leading-relaxed"
            >
              Connectez-vous pour acceder a vos ressources professionnelles.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">Acces securise et confidentiel</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">Formations certifiantes</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Award className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">Expertise reconnue</span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          <div className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900 mb-2">
              Connexion
            </h2>
            <p className="text-slate-500 text-sm">
              Connectez-vous a votre compte professionnel.
            </p>
          </div>

          {(authErrorMessage || lockoutRemainingMs > 0 || verificationEmail) && (
            <div className="space-y-3 mb-5">
              {authErrorMessage && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>{authErrorMessage}</p>
                </div>
              )}

              {lockoutRemainingMs > 0 && (
                <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
                  <Clock3 className="h-4 w-4 mt-0.5 shrink-0" />
                  <p>
                    Connexion bloquee pendant 20 minutes apres 5 echecs.
                    Temps restant: <strong>{formatDuration(lockoutRemainingMs)}</strong>
                  </p>
                </div>
              )}

              {verificationEmail && (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 space-y-2">
                  <p>
                    Email non verifie pour <strong>{verificationEmail}</strong>.
                  </p>
                  <div className="flex items-center justify-between gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleResendVerification}
                      disabled={isResendingVerification || resendCooldownSeconds > 0}
                      className="border-amber-300 bg-white hover:bg-amber-100 text-amber-900"
                    >
                      {isResendingVerification ? (
                        <>
                          <RefreshCw className="mr-2 h-3.5 w-3.5 animate-spin" />
                          Renvoi...
                        </>
                      ) : (
                        "Renvoyer le lien"
                      )}
                    </Button>
                    <span className="text-xs">
                      {resendCooldownSeconds > 0
                        ? `Nouveau renvoi dans ${resendCooldownSeconds}s`
                        : "Renvoi disponible"}
                    </span>
                  </div>
                  {typeof verificationRemainingMs === "number" && (
                    <p className="text-xs">
                      {verificationRemainingMs > 0
                        ? `Expiration du lien: ${formatDuration(verificationRemainingMs)}`
                        : "Lien expire. Renvoyez un email de verification."}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <Button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isGoogleLoading}
              className="w-full h-12 bg-white border border-slate-200 hover:bg-slate-50 transition-all duration-300 text-base font-medium"
            >
              {isGoogleLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin" />
                  Connexion avec Google...
                </div>
              ) : (
                <div className="flex items-center justify-center gap-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                    />
                  </svg>
                  <span className="text-slate-700">Continuer avec Google</span>
                </div>
              )}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t border-slate-200" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-slate-500">ou</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-slate-700 font-medium">
                Email professionnel
              </Label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <Input
                  id="email"
                  type="email"
                  placeholder="nom@entreprise.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="pl-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-slate-700 font-medium">
                Mot de passe
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="pl-12 pr-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  className="rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <span className="text-slate-600">Se souvenir de moi</span>
              </label>
              <Link
                href="/auth/reset-password"
                className="text-amber-600 hover:text-amber-700 font-medium transition-colors"
              >
                Mot de passe oublie ?
              </Link>
            </div>

            <Button
              type="submit"
              disabled={isLoading || lockoutRemainingMs > 0}
              className="w-full h-12 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium disabled:opacity-60"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Connexion...
                </div>
              ) : (
                <>
                  Se connecter
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-center text-sm text-slate-600">
              Pas encore de compte ?{" "}
              <Link
                href="/auth/inscription"
                className="text-amber-600 hover:text-amber-700 font-semibold transition-colors"
              >
                Creer un compte professionnel
              </Link>
            </p>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-slate-400">
            <div className="flex items-center gap-2 text-xs">
              <Shield className="h-4 w-4" />
              <span>SSL Securise</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Award className="h-4 w-4" />
              <span>Certifie RGPD</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white py-20" />}>
      <LoginPageContent />
    </Suspense>
  );
}
