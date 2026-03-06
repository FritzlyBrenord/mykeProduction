"use client";

import { EmailVerificationModal } from "@/components/auth/EmailVerificationModal";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/hooks/useAuth";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowRight,
  Award,
  CheckCircle,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Shield,
  User,
  XCircle,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

function validatePassword(pwd: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (pwd.length < 8) errors.push("Au moins 8 caracteres");
  if (!/[A-Z]/.test(pwd)) errors.push("Une majuscule");
  if (!/[a-z]/.test(pwd)) errors.push("Une minuscule");
  if (!/[0-9]/.test(pwd)) errors.push("Un chiffre");
  if (!/[!@#$%^&*(),.?\":{}|<>]/.test(pwd)) errors.push("Un caractere special");
  return { valid: errors.length === 0, errors };
}

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [verificationExpiresAtMs, setVerificationExpiresAtMs] = useState<
    number | null
  >(null);
  const [authErrorMessage, setAuthErrorMessage] = useState<string | null>(null);
  const {
    user,
    loading,
    signUp,
    signInWithGoogle,
    resendVerificationEmail,
    initError,
    pendingEmail,
    clearPendingEmail,
  } = useAuth();
  const router = useRouter();

  const passwordValidation = validatePassword(password);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/");
    }
  }, [loading, user, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthErrorMessage(null);

    if (password !== confirmPassword) {
      const message = "Les mots de passe ne correspondent pas.";
      setAuthErrorMessage(message);
      toast.error(message);
      return;
    }

    if (!acceptTerms) {
      const message = "Vous devez accepter les conditions d'utilisation.";
      setAuthErrorMessage(message);
      toast.error(message);
      return;
    }

    if (!passwordValidation.valid) {
      const message =
        "Le mot de passe ne respecte pas les criteres de securite.";
      setAuthErrorMessage(message);
      toast.error(message);
      return;
    }

    setIsLoading(true);

    try {
      const result = await signUp(
        email.trim().toLowerCase(),
        password,
        fullName,
      );

      if (result.error) {
        if (result.emailExists || result.code === "EMAIL_EXISTS") {
          const message =
            "Cet email est deja utilise. Connectez-vous ou reinitialisez votre mot de passe.";
          setAuthErrorMessage(message);
          toast.error(message);
        } else if (result.emailRateLimit || result.code === "RATE_LIMITED") {
          const message =
            "Trop de tentatives. Reessayez dans quelques minutes.";
          setAuthErrorMessage(message);
          toast.error(message);
        } else {
          const message =
            result.error.message || "Inscription impossible pour le moment.";
          setAuthErrorMessage(message);
          toast.error(message);
        }
      } else {
        setVerificationExpiresAtMs(result.verificationExpiresAtMs ?? null);
        setShowVerificationModal(true);
        toast.success("Compte cree. Verifiez votre email.");
      }
    } catch {
      const message = "Une erreur inattendue est survenue.";
      setAuthErrorMessage(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(error.message || "Inscription Google indisponible.");
      }
    } catch {
      toast.error("Une erreur est survenue.");
    } finally {
      setIsGoogleLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
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
          <div className="space-y-8">
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              className="font-[family-name:var(--font-playfair)] text-4xl xl:text-5xl font-semibold text-white leading-tight"
            >
              Rejoignez l&apos;excellence
              <span className="block text-amber-400">industrielle</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.6 }}
              className="text-lg text-slate-300 max-w-md leading-relaxed"
            >
              Creez un compte professionnel pour acceder a vos ressources.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.6 }}
              className="flex flex-col gap-4"
            >
              <div className="flex items-center gap-3 text-slate-300">
                <div className="w-10 h-10 rounded-lg bg-amber-400/10 flex items-center justify-center">
                  <CheckCircle className="h-5 w-5 text-amber-400" />
                </div>
                <span className="text-sm">
                  Acces gratuit aux ressources de base
                </span>
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
                <span className="text-sm">
                  Communaute professionnelle active
                </span>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.div>

      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-20 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md py-8"
        >
          <div className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900 mb-2">
              Creer un compte
            </h2>
            <p className="text-slate-500 text-sm">
              Inscription professionnelle securisee.
            </p>
          </div>

          {authErrorMessage && (
            <div className="mb-5 rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
              <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>{authErrorMessage}</p>
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
                  Inscription avec Google...
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
              <Label htmlFor="fullName" className="text-slate-700 font-medium">
                Nom complet
              </Label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <Input
                  id="fullName"
                  type="text"
                  placeholder="Jean Dupont"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="pl-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                  required
                />
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
                  minLength={8}
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
              <div className="mt-2 space-y-1">
                {password.length > 0 && (
                  <>
                    <div className="flex flex-wrap gap-1">
                      {passwordValidation.errors.length === 0 ? (
                        <span className="text-xs text-green-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" />
                          Mot de passe fort
                        </span>
                      ) : (
                        passwordValidation.errors.map((err, i) => (
                          <span
                            key={i}
                            className="text-xs text-amber-600 flex items-center gap-1"
                          >
                            <XCircle className="w-3 h-3" />
                            {err}
                          </span>
                        ))
                      )}
                    </div>
                    <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-300 ${
                          passwordValidation.valid
                            ? "bg-green-500 w-full"
                            : password.length >= 8
                              ? "bg-amber-500 w-2/3"
                              : "bg-red-500 w-1/3"
                        }`}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {showVerificationModal && (
              <EmailVerificationModal
                isOpen={showVerificationModal}
                email={pendingEmail || email}
                verificationExpiresAtMs={verificationExpiresAtMs}
                onClose={() => {
                  setShowVerificationModal(false);
                  clearPendingEmail();
                  router.push("/auth/connexion");
                }}
                onResend={resendVerificationEmail}
              />
            )}

            <div className="space-y-2">
              <Label
                htmlFor="confirmPassword"
                className="text-slate-700 font-medium"
              >
                Confirmer le mot de passe
              </Label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400 group-focus-within:text-amber-500 transition-colors" />
                <Input
                  id="confirmPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="pl-12 h-12 bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
                  required
                />
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={(checked) =>
                  setAcceptTerms(checked as boolean)
                }
                className="mt-0.5 border border-gray-700 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal leading-tight text-slate-600"
              >
                J&apos;accepte les{" "}
                <Link
                  href="/legal/cgu"
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  conditions d&apos;utilisation
                </Link>{" "}
                et la{" "}
                <Link
                  href="/legal/confidentialite"
                  className="text-amber-600 hover:text-amber-700 font-medium"
                >
                  politique de confidentialite
                </Link>
              </Label>
            </div>

            <Button
              type="submit"
              disabled={isLoading}
              className="w-full h-12 text-gray-200 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Inscription...
                </div>
              ) : (
                <>
                  S&apos;inscrire
                  <ArrowRight className="ml-2 h-5 w-5" />
                </>
              )}
            </Button>
          </form>

          <div className="mt-8 pt-6 border-t border-slate-200">
            <p className="text-center text-sm text-slate-600">
              Deja un compte ?{" "}
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
