"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Award,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  RefreshCw,
  Shield,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

const RESEND_COOLDOWN_SECONDS = 60;
const AUTH_OP_TIMEOUT_MS = 12000;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  if (password.length < 8) errors.push("Au moins 8 caracteres");
  if (!/[A-Z]/.test(password)) errors.push("Une majuscule");
  if (!/[a-z]/.test(password)) errors.push("Une minuscule");
  if (!/[0-9]/.test(password)) errors.push("Un chiffre");
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(password))
    errors.push("Un caractere special");
  return { valid: errors.length === 0, errors };
}

function readRecoveryTypeFromUrl() {
  if (typeof window === "undefined") return false;

  const url = new URL(window.location.href);
  if (url.searchParams.get("type") === "recovery") return true;

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return false;

  const hashParams = new URLSearchParams(hash);
  return hashParams.get("type") === "recovery";
}

function readRecoveryTokensFromUrl() {
  if (typeof window === "undefined") return null;

  const url = new URL(window.location.href);
  const queryAccessToken = url.searchParams.get("access_token");
  const queryRefreshToken = url.searchParams.get("refresh_token");
  if (queryAccessToken && queryRefreshToken) {
    return {
      accessToken: queryAccessToken,
      refreshToken: queryRefreshToken,
    };
  }

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;
  if (!hash) return null;

  const hashParams = new URLSearchParams(hash);
  const hashAccessToken = hashParams.get("access_token");
  const hashRefreshToken = hashParams.get("refresh_token");

  if (!hashAccessToken || !hashRefreshToken) {
    return null;
  }

  return {
    accessToken: hashAccessToken,
    refreshToken: hashRefreshToken,
  };
}

function readHashAuthErrorFromUrl() {
  if (typeof window === "undefined") return null;

  const hash = window.location.hash.startsWith("#")
    ? window.location.hash.slice(1)
    : window.location.hash;

  if (!hash) return null;

  const hashParams = new URLSearchParams(hash);
  const errorCode = hashParams.get("error_code");
  const errorDescription = hashParams.get("error_description");
  const error = hashParams.get("error");

  if (!errorCode && !error && !errorDescription) {
    return null;
  }

  return {
    errorCode: errorCode ?? "",
    error: error ?? "",
    errorDescription: errorDescription ?? "",
  };
}

function formatAuthError(message: string) {
  const normalized = message.toLowerCase();

  if (normalized.includes("timed out") || normalized.includes("timeout")) {
    return "Operation trop longue. Fermez les autres onglets ouverts puis reessayez.";
  }

  if (normalized.includes("expired")) {
    return "Le lien de reinitialisation a expire. Demandez un nouveau lien.";
  }

  if (normalized.includes("invalid")) {
    return "Le lien de reinitialisation est invalide. Demandez un nouveau lien.";
  }

  if (
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  ) {
    return "Trop de demandes. Attendez avant de renvoyer un nouvel email.";
  }

  if (
    normalized.includes("same as the old password") ||
    normalized.includes("different from the old")
  ) {
    return "Le nouveau mot de passe doit etre different de l'ancien.";
  }

  // If we don't have a custom translation, show the actual Supabase error so we can debug it
  return (
    message ||
    "Action impossible pour le moment. Reessayez dans quelques instants."
  );
}

async function withTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  message: string,
) {
  let timer: ReturnType<typeof setTimeout> | null = null;

  try {
    const timeoutPromise = new Promise<T>((_, reject) => {
      timer = setTimeout(() => {
        reject(new Error(message));
      }, timeoutMs);
    });
    return await Promise.race([operation, timeoutPromise]);
  } finally {
    if (timer !== null) {
      clearTimeout(timer);
    }
  }
}

function formatHashAuthError(
  payload: ReturnType<typeof readHashAuthErrorFromUrl>,
) {
  if (!payload) {
    return null;
  }

  const joined =
    `${payload.errorCode} ${payload.error} ${payload.errorDescription}`.toLowerCase();

  if (joined.includes("otp_expired") || joined.includes("expired")) {
    return "Le lien de reinitialisation a expire. Entrez votre email pour recevoir un nouveau lien.";
  }

  if (joined.includes("access_denied") || joined.includes("invalid")) {
    return "Le lien de reinitialisation est invalide. Demandez un nouveau lien.";
  }

  return "Le lien de reinitialisation est invalide ou incomplet. Demandez un nouveau lien.";
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mode, setMode] = useState<
    "request" | "recovery" | "emailSent" | "done"
  >("request");
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSubmittingEmail, setIsSubmittingEmail] = useState(false);
  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [resendCooldownSeconds, setResendCooldownSeconds] = useState(0);

  const passwordValidation = validatePassword(newPassword);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setResendCooldownSeconds((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;

    const bootstrap = async () => {
      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const hashAuthError = readHashAuthErrorFromUrl();

        if (hashAuthError) {
          const message = formatHashAuthError(hashAuthError);
          if (message) {
            setErrorMessage(message);
          }
          setMode("request");
          return;
        }

        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code);
          if (error) {
            if (!active) return;
            setErrorMessage(formatAuthError(error.message || ""));
            setMode("request");
            return;
          }
        }

        const hasRecoveryType = readRecoveryTypeFromUrl();

        if (hasRecoveryType) {
          let {
            data: { session },
          } = await supabase.auth.getSession();

          if (!session?.user) {
            const recoveryTokens = readRecoveryTokensFromUrl();

            if (recoveryTokens) {
              const {
                data: recoveredSessionData,
                error: recoveredSessionError,
              } = await supabase.auth.setSession({
                access_token: recoveryTokens.accessToken,
                refresh_token: recoveryTokens.refreshToken,
              });

              if (recoveredSessionError) {
                if (!active) return;
                setErrorMessage(
                  formatAuthError(recoveredSessionError.message || ""),
                );
                setMode("request");
                return;
              }

              session = recoveredSessionData.session;
            }
          }

          if (!active) return;

          if (session?.user) {
            setMode("recovery");
            setSuccessMessage(
              "Lien valide. Definissez maintenant un nouveau mot de passe.",
            );
          } else {
            setErrorMessage(
              "Lien invalide ou expire. Demandez un nouveau lien.",
            );
            setMode("request");
          }
          return;
        }

        if (active) {
          setMode("request");
        }
      } catch {
        if (active) {
          setErrorMessage(
            "Impossible de verifier le lien de reinitialisation.",
          );
          setMode("request");
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    bootstrap();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setMode("recovery");
        setErrorMessage(null);
        setSuccessMessage(
          "Lien valide. Definissez maintenant un nouveau mot de passe.",
        );
      }
    });

    return () => {
      active = false;
      subscription.unsubscribe();
    };
  }, [supabase]);

  const handleRequestReset = async (event: React.FormEvent) => {
    event.preventDefault();

    if (resendCooldownSeconds > 0) {
      setErrorMessage(
        `Nouvel envoi disponible dans ${resendCooldownSeconds}s.`,
      );
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setIsSubmittingEmail(true);

    try {
      const normalizedEmail = normalizeEmail(email);
      const response = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email: normalizedEmail }),
      });
      const payload = (await response.json().catch(() => null)) as {
        error?: string;
      } | null;

      if (!response.ok) {
        const serverError =
          payload?.error || "Envoi impossible pour le moment.";
        setErrorMessage(serverError);
        toast.error("Envoi impossible.");
        return;
      }

      setMode("emailSent");
      setResendCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      setSuccessMessage(
        "Si un compte existe pour cet email, un lien de reinitialisation a ete envoye.",
      );
      toast.success("Email de reinitialisation envoye.");
    } catch {
      setErrorMessage("Erreur reseau. Reessayez.");
      toast.error("Une erreur est survenue.");
    } finally {
      setIsSubmittingEmail(false);
    }
  };

  const handleUpdatePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage("Les mots de passe ne correspondent pas.");
      return;
    }

    if (!passwordValidation.valid) {
      setErrorMessage(
        "Le nouveau mot de passe ne respecte pas les criteres de securite.",
      );
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const { error } = await withTimeout(
        supabase.auth.updateUser({ password: newPassword }),
        AUTH_OP_TIMEOUT_MS,
        "Auth operation timed out",
      );

      if (error) {
        setErrorMessage(formatAuthError(error.message || ""));
        toast.error("Mise a jour impossible.");
        return;
      }

      setMode("done");
      setSuccessMessage(
        "Mot de passe mis a jour avec succes. Connectez-vous avec le nouveau mot de passe.",
      );
      toast.success("Mot de passe mis a jour.");

      void supabase.auth.signOut().catch(() => {
        // Best effort: redirect continues even if local signout is slow/fails.
      });

      window.setTimeout(() => {
        router.replace("/auth/connexion");
      }, 1200);
    } catch {
      setErrorMessage(
        "Une erreur est survenue pendant la mise a jour du mot de passe.",
      );
      toast.error("Une erreur est survenue.");
    } finally {
      setIsSubmittingPassword(false);
    }
  };

  const showRequestForm = mode === "request" || mode === "emailSent";
  const showRecoveryForm = mode === "recovery";

  return (
    <div className="min-h-screen flex bg-white py-20">
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
              Securisez votre
              <span className="block text-amber-400">compte</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-slate-300 max-w-md leading-relaxed"
            >
              Recuperez l&apos;acces a votre espace professionnel en toute
              securite.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <KeyRound className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">Lien unique de reinitialisation</span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Shield className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">
                  Validation securisee par Supabase
                </span>
              </div>
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">
                  Reconnexion immediate apres changement
                </span>
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
          <Link
            href="/auth/connexion"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-700 mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour a la connexion
          </Link>

          <div className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900 mb-2">
              {showRecoveryForm
                ? "Nouveau mot de passe"
                : "Mot de passe oublie"}
            </h2>
            <p className="text-slate-500 text-sm">
              {showRecoveryForm
                ? "Definissez un mot de passe fort pour finaliser la recuperation."
                : "Entrez votre email pour recevoir un lien de reinitialisation."}
            </p>
          </div>

          {isInitializing && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700 flex items-center gap-2 mb-5">
              <RefreshCw className="h-4 w-4 animate-spin" />
              Verification du lien de reinitialisation...
            </div>
          )}

          {errorMessage && (
            <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{errorMessage}</p>
            </div>
          )}

          {successMessage && (
            <div className="mb-5 rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-900 flex gap-2">
              <CheckCircle2 className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{successMessage}</p>
            </div>
          )}

          {showRequestForm && (
            <form onSubmit={handleRequestReset} className="space-y-5">
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
                    onChange={(event) => setEmail(event.target.value)}
                    className="pl-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                    required
                  />
                </div>
              </div>

              <Button
                type="submit"
                disabled={isSubmittingEmail || resendCooldownSeconds > 0}
                className="w-full h-12 bg-slate-900 text-amber-50 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium disabled:opacity-60"
              >
                {isSubmittingEmail ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Envoi en cours...
                  </div>
                ) : resendCooldownSeconds > 0 ? (
                  `Nouvel envoi dans ${resendCooldownSeconds}s`
                ) : (
                  <>
                    Envoyer le lien
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {showRecoveryForm && !isInitializing && (
            <form onSubmit={handleUpdatePassword} className="space-y-5">
              <div className="space-y-2">
                <Label
                  htmlFor="new-password"
                  className="text-slate-700 font-medium"
                >
                  Nouveau mot de passe
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  <Input
                    id="new-password"
                    type={showNewPassword ? "text" : "password"}
                    placeholder="********"
                    value={newPassword}
                    onChange={(event) => setNewPassword(event.target.value)}
                    className="pl-12 pr-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={
                      showNewPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showNewPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label
                  htmlFor="confirm-password"
                  className="text-slate-700 font-medium"
                >
                  Confirmer le mot de passe
                </Label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                  <Input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="********"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    className="pl-12 pr-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                    aria-label={
                      showConfirmPassword
                        ? "Masquer le mot de passe"
                        : "Afficher le mot de passe"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {newPassword.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-1">
                  <p className="text-xs font-medium text-slate-700">
                    Criteres de securite:
                  </p>
                  <ul className="text-xs space-y-1 text-slate-600">
                    <li>Au moins 8 caracteres</li>
                    <li>Au moins 1 majuscule, 1 minuscule, 1 chiffre</li>
                    <li>Au moins 1 caractere special</li>
                  </ul>
                  {!passwordValidation.valid && (
                    <p className="text-xs text-red-600">
                      Manquant: {passwordValidation.errors.join(", ")}.
                    </p>
                  )}
                </div>
              )}

              <Button
                type="submit"
                disabled={isSubmittingPassword}
                className="w-full h-12 bg-slate-900 text-gray-100 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium disabled:opacity-60"
              >
                {isSubmittingPassword ? (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Mise a jour...
                  </div>
                ) : (
                  <>
                    Mettre a jour le mot de passe
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </>
                )}
              </Button>
            </form>
          )}

          {mode === "done" && (
            <div className="space-y-4">
              <Button
                type="button"
                className="w-full h-12 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium"
                onClick={() => router.replace("/auth/connexion")}
              >
                Aller a la connexion
              </Button>
            </div>
          )}

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-center text-sm text-slate-600">
              Vous avez retrouve l&apos;acces ?{" "}
              <Link
                href="/auth/connexion"
                className="text-amber-600 hover:text-amber-700 font-semibold transition-colors"
              >
                Se connecter
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
