'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { CheckCircle, Package, Mail, ArrowRight, Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export default function CheckoutSuccessPage() {
  const orderNumber = 'CMD-' + Date.now().toString(36).toUpperCase();

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
            {/* Success Icon */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: 'spring' }}
              className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6"
            >
              <CheckCircle className="h-12 w-12 text-green-600" />
            </motion.div>

            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              Commande confirmée !
            </h1>
            <p className="text-slate-600 mb-6">
              Merci pour votre achat. Vous recevrez un email de confirmation sous peu.
            </p>

            {/* Order Details */}
            <div className="bg-slate-50 rounded-lg p-6 mb-8">
              <div className="grid grid-cols-2 gap-4 text-left">
                <div>
                  <p className="text-sm text-slate-500 mb-1">Numéro de commande</p>
                  <p className="font-semibold text-slate-900">{orderNumber}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-500 mb-1">Date</p>
                  <p className="font-semibold text-slate-900">
                    {new Date().toLocaleDateString('fr-FR')}
                  </p>
                </div>
              </div>
            </div>

            {/* Next Steps */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mb-3">
                  <Mail className="h-6 w-6 text-blue-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Email de confirmation</p>
                <p className="text-xs text-slate-500">Vérifiez votre boîte mail</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-amber-100 rounded-full flex items-center justify-center mb-3">
                  <Package className="h-6 w-6 text-amber-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Préparation</p>
                <p className="text-xs text-slate-500">Votre commande est préparée</p>
              </div>
              <div className="flex flex-col items-center p-4">
                <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mb-3">
                  <Download className="h-6 w-6 text-green-600" />
                </div>
                <p className="text-sm font-medium text-slate-900">Accès immédiat</p>
                <p className="text-xs text-slate-500">Vos formations sont disponibles</p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/compte/commandes">
                <Button variant="outline" className="w-full sm:w-auto">
                  Voir mes commandes
                </Button>
              </Link>
              <Link href="/compte/formations">
                <Button className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700">
                  Accéder à mes formations
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
