"use client";

import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { Mail, RefreshCw, X, CheckCircle, Timer } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface EmailVerificationModalProps {
  isOpen: boolean;
  email: string | null;
  verificationExpiresAtMs?: number | null;
  onClose: () => void;
  onResend: (
    email: string,
  ) => Promise<{ error: Error | null; code?: "RATE_LIMITED" | "UNKNOWN"; verificationExpiresAtMs?: number }>;
}

const RESEND_COOLDOWN_SECONDS = 60;

function formatDuration(ms: number) {
  const safeMs = Math.max(0, ms);
  const totalSeconds = Math.floor(safeMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours.toString().padStart(2, "0")}:${minutes
      .toString()
      .padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;
  }

  return `${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")}`;
}

export function EmailVerificationModal({
  isOpen,
  email,
  verificationExpiresAtMs,
  onClose,
  onResend,
}: EmailVerificationModalProps) {
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [cooldownSeconds, setCooldownSeconds] = useState(RESEND_COOLDOWN_SECONDS);
  const [nowMs, setNowMs] = useState(0);

  useEffect(() => {
    if (!isOpen) return;

    const interval = window.setInterval(() => {
      setNowMs(Date.now());
      setCooldownSeconds((previous) => (previous > 0 ? previous - 1 : 0));
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isOpen]);

  const expiresInMs = useMemo(() => {
    if (!verificationExpiresAtMs) return null;
    return verificationExpiresAtMs - nowMs;
  }, [verificationExpiresAtMs, nowMs]);

  const isExpired = typeof expiresInMs === "number" ? expiresInMs <= 0 : false;

  const handleResend = async () => {
    if (!email || cooldownSeconds > 0 || isResending) return;

    setIsResending(true);
    setResendSuccess(false);

    const result = await onResend(email);

    if (result.error) {
      if (result.code === "RATE_LIMITED") {
        toast.error("Trop de demandes. Patientez avant de renvoyer un email.");
      } else {
        toast.error("Impossible de renvoyer l'email pour le moment.");
      }
    } else {
      setResendSuccess(true);
      setCooldownSeconds(RESEND_COOLDOWN_SECONDS);
      toast.success("Email de verification renvoye.");
    }

    setIsResending(false);
  };

  return (
    <AnimatePresence>
      {isOpen && email && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 20 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
          >
            <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-8 text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="w-10 h-10 text-white" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Verifiez votre email</h2>
              <p className="text-white/90 text-sm">Un email de confirmation a ete envoye</p>
            </div>

            <div className="p-6 space-y-6">
              <div className="text-center space-y-3">
                <p className="text-slate-600">Adresse concernee :</p>
                <p className="font-semibold text-slate-900 bg-slate-100 py-2 px-4 rounded-lg">
                  {email}
                </p>
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 space-y-2">
                <p className="text-sm text-amber-800">
                  Activez votre compte via le lien recu par email avant de vous connecter.
                </p>
                {typeof expiresInMs === "number" && (
                  <div className="text-xs text-amber-900 flex items-center gap-2">
                    <Timer className="w-3.5 h-3.5" />
                    {isExpired
                      ? "Le lien a expire. Renvoyez un email de verification."
                      : `Expiration du lien: ${formatDuration(expiresInMs)}`}
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Button
                  onClick={handleResend}
                  disabled={isResending || cooldownSeconds > 0}
                  variant="outline"
                  className="w-full h-12 border-slate-300 hover:bg-slate-50"
                >
                  {isResending ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Envoi en cours...
                    </>
                  ) : resendSuccess ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                      Email renvoye
                    </>
                  ) : (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Renvoyer l&apos;email
                    </>
                  )}
                </Button>

                {cooldownSeconds > 0 && (
                  <p className="text-xs text-center text-slate-500">
                    Nouveau renvoi disponible dans {cooldownSeconds}s
                  </p>
                )}

                <Button
                  onClick={onClose}
                  variant="ghost"
                  className="w-full h-12 text-slate-600 hover:text-slate-900"
                >
                  <X className="w-4 h-4 mr-2" />
                  Annuler et aller a la connexion
                </Button>
              </div>

              <p className="text-xs text-center text-slate-500">
                Verifiez aussi votre dossier spam.
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
