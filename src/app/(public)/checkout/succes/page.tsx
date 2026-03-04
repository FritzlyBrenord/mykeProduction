"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { ArrowRight, CheckCircle, Clock, Mail, Package } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";

function CheckoutSuccessPageContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get("order");

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
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="h-12 w-12 text-green-600" />
            </motion.div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Commande confirmee
            </h1>
            <p className="text-slate-600 mb-6">
              Paiement simule valide. Vous recevrez un email de confirmation.
            </p>

            <div className="bg-slate-50 rounded-lg p-6 mb-8 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-500 mb-1">
                    Numero de commande
                  </p>
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
                <p className="text-sm font-medium text-slate-900">
                  Email client
                </p>
                <p className="text-xs text-slate-500">Confirmation envoyee</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <Clock className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Traitement</p>
                <p className="text-xs text-slate-500">Jusqua 24h maximum</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">
                  Suivi actif
                </p>
                <p className="text-xs text-slate-500">
                  Disponible dans Mes commandes
                </p>
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
              <Link href="/compte/commandes">
                <Button variant="outline" className="w-full sm:w-auto">
                  Voir toutes mes commandes
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
    <Suspense
      fallback={<div className="min-h-screen bg-slate-50 py-12 px-4" />}
    >
      <CheckoutSuccessPageContent />
    </Suspense>
  );
}
