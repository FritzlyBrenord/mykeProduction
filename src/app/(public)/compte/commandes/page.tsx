'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { 
  Package, Download, ChevronRight, Clock, CheckCircle, 
  Truck, XCircle, CreditCard 
} from 'lucide-react';
import { Commande } from '@/lib/types';
import { formatPrice, formatDate } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

const mockOrders: Commande[] = [
  {
    id: 'cmd-001',
    user_id: '1',
    status: 'delivered',
    subtotal: 290.80,
    discount_amount: 0,
    tax_amount: 58.16,
    total_amount: 348.96,
    currency: 'EUR',
    coupon_id: null,
    shipping_address: {
      first_name: 'Jean',
      last_name: 'Dupont',
      address: '123 Rue de la Paix',
      city: 'Paris',
      postal_code: '75001',
      country: 'FR',
    },
    payment_method: 'stripe',
    created_at: '2024-02-15T10:30:00Z',
    updated_at: '2024-02-18T14:20:00Z',
    items: [
      { id: '1', commande_id: 'cmd-001', produit_id: '1', item_type: 'produit', quantity: 2, unit_price: 45.90, total_price: 91.80 },
      { id: '2', commande_id: 'cmd-001', formation_id: '1', item_type: 'formation', quantity: 1, unit_price: 199, total_price: 199 },
    ],
  },
  {
    id: 'cmd-002',
    user_id: '1',
    status: 'processing',
    subtotal: 89.90,
    discount_amount: 10,
    tax_amount: 15.98,
    total_amount: 95.88,
    currency: 'EUR',
    coupon_id: '1',
    shipping_address: {
      first_name: 'Jean',
      last_name: 'Dupont',
      address: '123 Rue de la Paix',
      city: 'Paris',
      postal_code: '75001',
      country: 'FR',
    },
    payment_method: 'paypal',
    created_at: '2024-02-20T09:15:00Z',
    updated_at: '2024-02-20T09:15:00Z',
    items: [
      { id: '3', commande_id: 'cmd-002', produit_id: '4', item_type: 'produit', quantity: 1, unit_price: 89.90, total_price: 89.90 },
    ],
  },
];

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: any }> = {
    pending: { label: 'En attente', variant: 'secondary', icon: Clock },
    paid: { label: 'Payée', variant: 'default', icon: CreditCard },
    processing: { label: 'En préparation', variant: 'default', icon: Package },
    shipped: { label: 'Expédiée', variant: 'default', icon: Truck },
    delivered: { label: 'Livrée', variant: 'default', icon: CheckCircle },
    cancelled: { label: 'Annulée', variant: 'destructive', icon: XCircle },
    refunded: { label: 'Remboursée', variant: 'outline', icon: CreditCard },
  };

  const config = statusConfig[status] || statusConfig.pending;
  const Icon = config.icon;

  return (
    <Badge variant={config.variant} className="flex items-center gap-1 w-fit">
      <Icon className="h-3 w-3" />
      {config.label}
    </Badge>
  );
};

export default function OrdersPage() {
  const [selectedOrder, setSelectedOrder] = useState<Commande | null>(null);

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes commandes</h1>
          <p className="text-slate-600 mb-8">
            Consultez l'historique et le suivi de vos commandes
          </p>

          {mockOrders.length > 0 ? (
            <div className="space-y-4">
              {mockOrders.map((order) => (
                <Card key={order.id} className="overflow-hidden">
                  <CardContent className="p-6">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                      {/* Order Info */}
                      <div className="flex-1">
                        <div className="flex flex-wrap items-center gap-3 mb-2">
                          <span className="font-semibold text-slate-900">{order.id.toUpperCase()}</span>
                          {getStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-slate-500 mb-1">
                          Passée le {formatDate(order.created_at)}
                        </p>
                        <p className="text-lg font-semibold text-slate-900">
                          {formatPrice(order.total_amount)}
                        </p>
                      </div>

                      {/* Items Preview */}
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          {order.items?.slice(0, 3).map((item, index) => (
                            <div
                              key={index}
                              className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white flex items-center justify-center text-xs font-medium"
                            >
                              {item.item_type === 'produit' ? 'P' : item.item_type === 'formation' ? 'F' : 'V'}
                            </div>
                          ))}
                          {(order.items?.length || 0) > 3 && (
                            <div className="w-10 h-10 rounded-full bg-slate-100 border-2 border-white flex items-center justify-center text-xs">
                              +{(order.items?.length || 0) - 3}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-2">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" onClick={() => setSelectedOrder(order)}>
                              Détails
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Commande {order.id.toUpperCase()}</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              {/* Status */}
                              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-lg">
                                <span className="text-slate-600">Statut</span>
                                {getStatusBadge(order.status)}
                              </div>

                              {/* Items */}
                              <div>
                                <h4 className="font-semibold text-slate-900 mb-3">Articles</h4>
                                <div className="space-y-2">
                                  {order.items?.map((item) => (
                                    <div
                                      key={item.id}
                                      className="flex items-center justify-between p-3 border rounded-lg"
                                    >
                                      <div>
                                        <p className="font-medium text-slate-900">
                                          {item.item_type === 'produit' ? 'Produit' : 
                                           item.item_type === 'formation' ? 'Formation' : 'Vidéo'}
                                        </p>
                                        <p className="text-sm text-slate-500">
                                          Quantité: {item.quantity}
                                        </p>
                                      </div>
                                      <span className="font-semibold">
                                        {formatPrice(item.total_price)}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              {/* Totals */}
                              <div className="space-y-2 pt-4 border-t">
                                <div className="flex justify-between text-slate-600">
                                  <span>Sous-total</span>
                                  <span>{formatPrice(order.subtotal)}</span>
                                </div>
                                {order.discount_amount > 0 && (
                                  <div className="flex justify-between text-green-600">
                                    <span>Réduction</span>
                                    <span>-{formatPrice(order.discount_amount)}</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-slate-600">
                                  <span>TVA</span>
                                  <span>{formatPrice(order.tax_amount)}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold text-slate-900">
                                  <span>Total</span>
                                  <span>{formatPrice(order.total_amount)}</span>
                                </div>
                              </div>

                              {/* Shipping Address */}
                              <div className="pt-4 border-t">
                                <h4 className="font-semibold text-slate-900 mb-2">Adresse de livraison</h4>
                                <p className="text-slate-600">
                                  {order.shipping_address?.first_name} {order.shipping_address?.last_name}<br />
                                  {order.shipping_address?.address}<br />
                                  {order.shipping_address?.postal_code} {order.shipping_address?.city}<br />
                                  {order.shipping_address?.country}
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        {order.status === 'delivered' && (
                          <Button variant="outline" size="icon">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucune commande
                </h2>
                <p className="text-slate-500 mb-6">
                  Vous n'avez pas encore passé de commande
                </p>
                <Link href="/boutique">
                  <Button className="bg-blue-600 hover:bg-blue-700">
                    Découvrir la boutique
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
