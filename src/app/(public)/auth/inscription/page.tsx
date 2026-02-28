"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Award,
  CheckCircle,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signUp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error("Les mots de passe ne correspondent pas");
      return;
    }

    if (!acceptTerms) {
      toast.error("Vous devez accepter les conditions d'utilisation");
      return;
    }

    if (password.length < 8) {
      toast.error("Le mot de passe doit contenir au moins 8 caracteres");
      return;
    }

    setIsLoading(true);

    try {
      const { error } = await signUp(email, password, fullName);

      if (error) {
        toast.error(error.message || "Erreur lors de l'inscription");
      } else {
        toast.success(
          "Inscription reussie ! Verifiez votre email pour confirmer votre compte.",
        );
        router.push("/auth/connexion");
      }
    } catch (error) {
      toast.error("Une erreur est survenue");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex bg-white">
      {/* Left Side - Branding */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
        className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-slate-950"
      >
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_70%,_rgba(245,158,11,0.15)_0%,_transparent_50%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,_rgba(245,158,11,0.1)_0%,_transparent_40%)]" />
        </div>

        {/* Decorative Elements */}
        <div className="absolute top-20 left-20 w-32 h-32 border border-amber-400/20 rounded-full" />
        <div className="absolute top-28 left-28 w-24 h-24 border border-amber-400/10 rounded-full" />
        <div className="absolute bottom-40 right-20 w-48 h-1 bg-gradient-to-r from-transparent via-amber-400/30 to-transparent" />

        <div className="relative z-10 flex flex-col justify-between p-12 xl:p-20">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="absolute -bottom-1 -right-1 w-3 h-3 border-r-2 border-b-2 border-amber-400/60" />
            </div>
            <div className="flex flex-col"></div>
          </div>

          {/* Value Proposition */}
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
              Creez votre compte pour acceder a nos formations premium,
              ressources exclusives et outils professionnels.
            </motion.p>

            {/* Features */}
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
                  Rejoignez +10 000 professionnels
                </span>
              </div>
            </motion.div>
          </div>

          {/* Bottom Quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="border-l-2 border-amber-400/30 pl-4"
          >
            <p className="text-sm text-slate-400 italic">
              &quot;Le savoir est le seul tresir que personne ne peut vous
              voler.&quot;
            </p>
            <p className="text-xs text-amber-400/60 mt-1">
              — Benjamin Franklin
            </p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-20 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md py-8"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8"></div>

          <div className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900 mb-2">
              Creer un compte
            </h2>
            <p className="text-slate-500 text-sm">
              Inscrivez-vous pour acceder a toutes nos ressources
              professionnelles.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
                  className="pl-12 h-12 bg-slate-50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
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
                  className="pl-12 h-12 bg-slate-50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
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
                  className="pl-12 pr-12 h-12 bg-slate-50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
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
              <p className="text-xs text-slate-500">Minimum 8 caracteres</p>
            </div>

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
                  className="pl-12 h-12 bg-slate-50 border-slate-200 focus:border-amber-400 focus:ring-amber-400/20 transition-all"
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
                className="mt-0.5 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500"
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
              className="w-full h-12 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium"
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

          {/* Trust Indicators */}
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
