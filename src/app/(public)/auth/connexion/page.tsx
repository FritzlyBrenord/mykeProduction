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
  ArrowRight,
  Sparkles,
  Shield,
  Zap,
  Award,
} from "lucide-react";
import { useAuth } from "@/lib/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { signIn } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        toast.error("Email ou mot de passe incorrect");
      } else {
        toast.success("Connexion réussie !");
        router.push("/");
        router.refresh();
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
            <div className="flex flex-col">
              <span className="font-[family-name:var(--font-playfair)] font-semibold text-xl tracking-tight text-white"></span>
              <span className="text-[10px] uppercase tracking-[0.2em] -mt-0.5 text-amber-400/80"></span>
            </div>
          </div>

          {/* Value Proposition */}
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
              Connectez-vous pour decouvrir nos formations premium, ressources
              exclusives et outils professionnels.
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

          {/* Bottom Quote */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.7, duration: 0.6 }}
            className="border-l-2 border-amber-400/30 pl-4"
          >
            <p className="text-sm text-slate-400 italic">
              &quot;L&apos;excellence n&apos;est pas un acte, mais une
              habitude.&quot;
            </p>
            <p className="text-xs text-amber-400/60 mt-1">— Aristote</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Right Side - Form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12 xl:p-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full max-w-md"
        >
          {/* Mobile Logo */}
          <div className="lg:hidden flex items-center justify-center gap-3 mb-8">
            <span className="font-[family-name:var(--font-playfair)] font-semibold text-lg text-slate-900"></span>
          </div>

          <div className="text-center mb-8">
            <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900 mb-2">
              Connexion
            </h2>
            <p className="text-slate-500 text-sm">
              Bienvenue. Connectez-vous a votre compte professionnel.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
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
              disabled={isLoading}
              className="w-full h-12 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 text-base font-medium"
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
