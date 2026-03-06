"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  CheckCircle,
  Clock,
  Mail,
  Package,
  RefreshCw,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useState } from "react";

type VerificationState = "verifying" | "paid" | "pending" | "failed";

function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");
  const paymentIntentId = searchParams.get("payment_intent");
  const [state, setState] = useState<VerificationState>("verifying");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const verify = async () => {
      if (!orderId || !paymentIntentId) {
        setState("pending");
        setMessage(
          "Paiement en verification. Consultez l'historique des transactions dans votre compte.",
        );
        return;
      }

      try {
        const response = await fetch("/api/checkout/confirm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            orderId,
            paymentIntentId,
          }),
        });
        const data = await response.json().catch(() => null);
        if (!active) return;

        if (!response.ok) {
          setState("failed");
          setMessage(data?.error || "Impossible de confirmer le paiement.");
          return;
        }

        if (data?.status === "paid") {
          setState("paid");
          setMessage("Paiement confirme. Votre commande est en cours de traitement.");
          return;
        }

        if (data?.status === "pending") {
          setState("pending");
          setMessage(
            "Paiement en cours de validation. Le statut sera mis a jour automatiquement.",
          );
          return;
        }

        setState("pending");
        setMessage("Paiement en verification.");
      } catch (error) {
        console.error("Checkout success verification error:", error);
        if (!active) return;
        setState("pending");
        setMessage("Verification du paiement en cours.");
      }
    };

    void verify();

    return () => {
      active = false;
    };
  }, [orderId, paymentIntentId]);

  const stateConfig = useMemo(() => {
    if (state === "paid") {
      return {
        icon: <CheckCircle className="h-12 w-12 text-green-600" />,
        title: "Paiement confirme",
        accentClass: "bg-green-100",
      };
    }
    if (state === "failed") {
      return {
        icon: <AlertCircle className="h-12 w-12 text-red-600" />,
        title: "Verification echouee",
        accentClass: "bg-red-100",
      };
    }
    return {
      icon:
        state === "verifying" ? (
          <RefreshCw className="h-12 w-12 text-blue-600 animate-spin" />
        ) : (
          <Clock className="h-12 w-12 text-amber-600" />
        ),
      title: state === "verifying" ? "Verification du paiement" : "Paiement en attente",
      accentClass: state === "verifying" ? "bg-blue-100" : "bg-amber-100",
    };
  }, [state]);

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-2xl"
      >
        <Card className="shadow-xl border-0">
          <CardContent className="p-8 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring" }}
              className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${stateConfig.accentClass}`}
            >
              {stateConfig.icon}
            </motion.div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">{stateConfig.title}</h1>
            <p className="text-slate-600 mb-6">
              {message ||
                "Votre paiement est en cours de verification. Ce statut sera mis a jour automatiquement."}
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Numero de commande</p>
                  <p className="font-semibold text-slate-900 break-all">
                    #{orderId?.split("-")[0] || "Indisponible"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Date</p>
                  <p className="font-semibold text-slate-900">
                    {new Date().toLocaleDateString("fr-FR")}
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Email client</p>
                <p className="text-xs text-slate-500">Confirmation et recus</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Traitement</p>
                <p className="text-xs text-slate-500">Statut mis a jour en temps reel</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Suivi actif</p>
                <p className="text-xs text-slate-500">Historique dans votre compte</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href={
                  orderId
                    ? `/compte/commandes/${encodeURIComponent(orderId)}`
                    : "/compte/commandes"
                }
              >
                <Button variant="outline" className="w-full sm:w-auto">
                  Suivre cette commande
                </Button>
              </Link>
              <Link href="/compte/transactions">
                <Button variant="outline" className="w-full sm:w-auto">
                  Mes transactions
                </Button>
              </Link>
              <Link href="/">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                  Retour accueil
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 py-12 px-4" />}>
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
