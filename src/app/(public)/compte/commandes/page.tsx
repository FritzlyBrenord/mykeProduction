'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { formatDate, formatPrice } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  CreditCard,
  Eye,
  Package,
  PlayCircle,
  Truck,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface OrderItem {
  id: string;
  item_type: 'produit' | 'formation' | 'video';
  quantity: number;
  unit_price: number;
  total_price: number;
  formation_authorized?: boolean | null;
  formation_progress?: number | null;
  produit: { name: string | null; slug: string | null; type?: string | null } | null;
  formation: { title: string | null; slug: string | null } | null;
  video: { title: string | null; slug: string | null } | null;
}

interface Order {
  id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  shipping_address: Record<string, unknown> | null;
  payment_method: 'stripe' | 'paypal' | null;
  created_at: string;
  items: OrderItem[];
}

const statusConfig: Record<
  string,
  { label: string; className: string; icon: typeof Clock }
> = {
  pending: {
    label: 'En attente',
    className: 'bg-slate-100 text-slate-700 border-slate-200',
    icon: Clock,
  },
  paid: {
    label: 'Payee',
    className: 'bg-blue-100 text-blue-700 border-blue-200',
    icon: CreditCard,
  },
  processing: {
    label: 'En traitement',
    className: 'bg-amber-100 text-amber-800 border-amber-200',
    icon: Package,
  },
  shipped: {
    label: 'Expediee',
    className: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    icon: Truck,
  },
  delivered: {
    label: 'Livree',
    className: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    icon: CheckCircle2,
  },
  cancelled: {
    label: 'Annulee',
    className: 'bg-red-100 text-red-700 border-red-200',
    icon: XCircle,
  },
  refunded: {
    label: 'Remboursee',
    className: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
    icon: CreditCard,
  },
};

const statusProgress: Record<string, number> = {
  pending: 15,
  paid: 35,
  processing: 55,
  shipped: 80,
  delivered: 100,
  cancelled: 100,
  refunded: 100,
};

function orderStatusBadge(status: string) {
  const config = statusConfig[status] ?? statusConfig.pending;
  const Icon = config.icon;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-medium ${config.className}`}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </span>
  );
}

function itemLabel(item: OrderItem) {
  if (item.item_type === 'produit') return item.produit?.name || 'Produit';
  if (item.item_type === 'formation') return item.formation?.title || 'Formation';
  return item.video?.title || 'Video';
}

function itemTypeBadge(item: OrderItem) {
  if (item.item_type === 'formation') {
    return (
      <Badge className="bg-blue-100 text-blue-700 border-blue-200">Formation</Badge>
    );
  }
  if (item.item_type === 'video') {
    return (
      <Badge className="bg-purple-100 text-purple-700 border-purple-200">Video</Badge>
    );
  }
  if (item.produit?.type === 'chimique') {
    return (
      <Badge className="bg-amber-100 text-amber-800 border-amber-200">
        Produit chimique
      </Badge>
    );
  }
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Produit</Badge>;
}

function shortOrderId(orderId: string) {
  return `#${orderId.slice(0, 8)}`;
}

function formationProgressLabel(
  authorized: boolean | null | undefined,
  progress: number | null | undefined,
) {
  if (!authorized) {
    return "En attente d'autorisation admin";
  }
  const value = Number(progress ?? 0);
  if (value <= 0) {
    return 'Non commencee';
  }
  return `${value}%`;
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      try {
        setLoading(true);
        const response = await fetch('/api/commandes', { credentials: 'include' });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Erreur chargement commandes');
        }
        if (!active) return;
        setOrders(Array.isArray(data) ? (data as Order[]) : []);
      } catch (error) {
        console.error('Orders load error:', error);
        toast.error("Impossible de recuperer l'historique des commandes.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, []);

  const metrics = useMemo(() => {
    const total = orders.length;
    const processing = orders.filter((order) =>
      ['pending', 'paid', 'processing', 'shipped'].includes(order.status),
    ).length;
    const delivered = orders.filter((order) => order.status === 'delivered').length;
    const formationPending = orders
      .flatMap((order) => order.items || [])
      .filter(
        (item) => item.item_type === 'formation' && item.formation_authorized === false,
      ).length;
    return { total, processing, delivered, formationPending };
  }, [orders]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-blue-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800 p-6 md:p-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mes commandes</h1>
          <p className="text-slate-200 mt-2 max-w-3xl">
            Suivez toutes vos commandes en un seul endroit: produits, videos et
            formations.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Total commandes</p>
              <p className="text-3xl font-bold text-slate-900 mt-1">{metrics.total}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">En cours</p>
              <p className="text-3xl font-bold text-amber-700 mt-1">{metrics.processing}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Livrees</p>
              <p className="text-3xl font-bold text-emerald-700 mt-1">{metrics.delivered}</p>
            </CardContent>
          </Card>
          <Card className="border-slate-200">
            <CardContent className="p-5">
              <p className="text-sm text-slate-500">Formations en attente</p>
              <p className="text-3xl font-bold text-blue-700 mt-1">
                {metrics.formationPending}
              </p>
            </CardContent>
          </Card>
        </motion.div>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="p-10 text-center text-slate-600">
              Chargement des commandes...
            </CardContent>
          </Card>
        ) : orders.length > 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {orders.map((order) => (
              <Card key={order.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-slate-900">{shortOrderId(order.id)}</p>
                          {orderStatusBadge(order.status)}
                        </div>
                        <p className="text-sm text-slate-600 mt-1">
                          Passee le {formatDate(order.created_at)}
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <p className="text-lg font-semibold text-slate-900">
                          {formatPrice(order.total_amount, order.currency || 'USD')}
                        </p>
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>Suivi commande {shortOrderId(order.id)}</DialogTitle>
                            </DialogHeader>

                            <div className="space-y-4">
                              <div className="rounded-xl bg-slate-100 p-4 space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="text-sm text-slate-600">Statut global</span>
                                  {orderStatusBadge(order.status)}
                                </div>
                                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                                  <div
                                    className="h-full rounded-full bg-blue-600 transition-all"
                                    style={{
                                      width: `${
                                        statusProgress[order.status] ?? statusProgress.pending
                                      }%`,
                                    }}
                                  />
                                </div>
                              </div>

                              <div className="space-y-2">
                                {(order.items || []).map((item) => (
                                  <div
                                    key={item.id}
                                    className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
                                  >
                                    <div className="min-w-0">
                                      <div className="flex items-center gap-2 mb-1">
                                        {itemTypeBadge(item)}
                                        {item.item_type === 'formation' &&
                                          (item.formation_authorized ? (
                                            <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                                              Autorisee
                                            </Badge>
                                          ) : (
                                            <Badge className="bg-amber-100 text-amber-800 border-amber-200">
                                              En attente d&apos;autorisation
                                            </Badge>
                                          ))}
                                      </div>
                                      <p className="font-medium text-slate-900 truncate">
                                        {itemLabel(item)}
                                      </p>
                                      <p className="text-sm text-slate-600">
                                        Quantite: {item.quantity}
                                      </p>
                                      {item.item_type === 'formation' && (
                                        <p className="text-sm text-slate-600">
                                          Acces:{' '}
                                          {formationProgressLabel(
                                            item.formation_authorized,
                                            item.formation_progress,
                                          )}
                                        </p>
                                      )}
                                    </div>
                                    <p className="font-semibold text-slate-900">
                                      {formatPrice(item.total_price, order.currency || 'USD')}
                                    </p>
                                  </div>
                                ))}
                              </div>

                              <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-4">
                                <div className="flex justify-between text-sm text-slate-700">
                                  <span>Sous-total</span>
                                  <span>{formatPrice(order.subtotal, order.currency || 'USD')}</span>
                                </div>
                                {order.discount_amount > 0 && (
                                  <div className="flex justify-between text-sm text-emerald-700">
                                    <span>Reduction</span>
                                    <span>
                                      -{formatPrice(order.discount_amount, order.currency || 'USD')}
                                    </span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm text-slate-700">
                                  <span>Taxes</span>
                                  <span>{formatPrice(order.tax_amount, order.currency || 'USD')}</span>
                                </div>
                                <div className="flex justify-between text-lg font-semibold text-slate-900 pt-2 border-t border-slate-200">
                                  <span>Total</span>
                                  <span>
                                    {formatPrice(order.total_amount, order.currency || 'USD')}
                                  </span>
                                </div>
                              </div>

                              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                                <p>
                                  Les formations apparaissent dans &quot;Mes formations&quot; en attente,
                                  puis deviennent accessibles des qu&apos;elles sont autorisees.
                                </p>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      {(order.items || []).slice(0, 4).map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5"
                        >
                          {itemTypeBadge(item)}
                          <span className="text-sm text-slate-700 truncate max-w-[220px]">
                            {itemLabel(item)}
                          </span>
                          {item.item_type === 'formation' && !item.formation_authorized && (
                            <span className="text-xs text-amber-700 font-medium">
                              En attente
                            </span>
                          )}
                          {item.item_type === 'formation' && item.formation_authorized && (
                            <span className="text-xs text-emerald-700 font-medium">
                              {formationProgressLabel(
                                item.formation_authorized,
                                item.formation_progress,
                              )}
                            </span>
                          )}
                        </div>
                      ))}
                      {(order.items || []).length > 4 && (
                        <span className="text-xs text-slate-500 self-center">
                          +{(order.items || []).length - 4} element(s)
                        </span>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <Package className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune commande</h2>
              <p className="text-slate-600 mb-6">
                Vous n&apos;avez pas encore passe de commande.
              </p>
              <Link href="/boutique">
                <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                  Decouvrir la boutique
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {orders.length > 0 && (
          <div className="flex justify-end">
            <Link href="/compte/formations">
              <Button
                variant="outline"
                className="border-blue-300 text-blue-800 hover:bg-blue-50"
              >
                <PlayCircle className="h-4 w-4 mr-2" />
                Voir mes formations
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
