'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  ORDER_TRACKING_STAGES,
  orderItemProgressPercent,
  orderItemStatusLabel,
  orderProgressPercent,
  orderStatusLabel,
  trackingStageState,
} from '@/lib/orders/tracking';
import { formatDate, formatDateTime, formatPrice } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  CreditCard,
  Package,
  RefreshCw,
  Truck,
} from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface TrackingEvent {
  status: string;
  label: string;
  at: string;
  note?: string;
}

interface OrderItem {
  id: string;
  item_type: 'produit' | 'formation' | 'video';
  item_status: string;
  authorized_at?: string | null;
  processing_at?: string | null;
  shipped_at?: string | null;
  delivered_at?: string | null;
  cancelled_at?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  produit: { name: string | null; type?: string | null } | null;
  formation: { title: string | null } | null;
  video: { title: string | null } | null;
}

interface OrderTracking {
  id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  created_at: string;
  estimated_delivery_at: string | null;
  payment_method: string | null;
  payment: {
    id: string;
    provider: 'stripe' | 'paypal';
    status: string | null;
    amount: number;
    metadata: Record<string, unknown> | null;
    created_at: string;
  } | null;
  tracking_timeline: TrackingEvent[];
  items: OrderItem[];
}

function itemName(item: OrderItem) {
  if (item.item_type === 'produit') return item.produit?.name || 'Produit';
  if (item.item_type === 'formation') return item.formation?.title || 'Formation';
  return item.video?.title || 'Video';
}

function itemBadge(item: OrderItem) {
  if (item.item_type === 'formation') {
    return <Badge className="bg-blue-100 text-blue-700 border-blue-200">Formation</Badge>;
  }
  if (item.item_type === 'video') {
    return <Badge className="bg-violet-100 text-violet-700 border-violet-200">Video</Badge>;
  }
  if (item.produit?.type === 'chimique') {
    return <Badge className="bg-amber-100 text-amber-800 border-amber-200">Produit chimique</Badge>;
  }
  if (item.produit?.type === 'document') {
    return <Badge className="bg-cyan-100 text-cyan-800 border-cyan-200">Document</Badge>;
  }
  return <Badge className="bg-slate-100 text-slate-700 border-slate-200">Produit</Badge>;
}

function itemStatusClass(status: string) {
  if (status === 'paid') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'processing') return 'bg-amber-100 text-amber-800 border-amber-200';
  if (status === 'shipped') return 'bg-indigo-100 text-indigo-700 border-indigo-200';
  if (status === 'delivered') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'cancelled') return 'bg-red-100 text-red-700 border-red-200';
  if (status === 'refunded') return 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
}

export default function OrderTrackingPage() {
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<OrderTracking | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const orderId = useMemo(() => {
    if (!params?.id) return '';
    return Array.isArray(params.id) ? params.id[0] : params.id;
  }, [params]);

  const fetchOrder = useCallback(
    async (silent: boolean) => {
      if (!orderId) return;

      try {
        if (silent) {
          setRefreshing(true);
        } else {
          setLoading(true);
        }

        const response = await fetch(`/api/commandes/${encodeURIComponent(orderId)}`, {
          credentials: 'include',
          cache: 'no-store',
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data?.error || 'Commande introuvable');
        }
        setOrder(data as OrderTracking);
      } catch (error) {
        console.error('Order tracking load error:', error);
        if (!silent) {
          toast.error("Impossible de charger le suivi de commande.");
          setOrder(null);
        }
      } finally {
        if (silent) {
          setRefreshing(false);
        } else {
          setLoading(false);
        }
      }
    },
    [orderId],
  );

  useEffect(() => {
    if (!orderId) return;
    let active = true;

    const runInitial = async () => {
      if (!active) return;
      await fetchOrder(false);
    };

    void runInitial();
    const timer = window.setInterval(() => {
      if (!active) return;
      void fetchOrder(true);
    }, 30000);

    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [orderId, fetchOrder]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center text-slate-600">
          Chargement du suivi...
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-5xl px-4 text-center">
          <h1 className="text-2xl font-semibold text-slate-900">Commande introuvable</h1>
          <p className="mt-2 text-slate-600">Cette commande est inaccessible ou inexistante.</p>
          <Link href="/compte/commandes">
            <Button className="mt-6">Retour a mes commandes</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <Link href="/compte/commandes" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4" />
            Retour a mes commandes
          </Link>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void fetchOrder(true)}
              disabled={refreshing}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Actualisation...' : 'Actualiser'}
            </Button>
            <Badge className="bg-slate-900 text-white">
              {orderStatusLabel(order.status)}
            </Badge>
          </div>
        </div>

        <Card className="border-slate-200">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <p className="text-sm text-slate-500">Commande</p>
                <h1 className="text-2xl font-bold text-slate-900 break-all">{order.id}</h1>
                <p className="text-sm text-slate-500 mt-1">
                  Passee le {formatDateTime(order.created_at)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-sm text-slate-500">Total</p>
                <p className="text-2xl font-bold text-slate-900">
                  {formatPrice(order.total_amount, order.currency || 'USD')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 overflow-hidden">
          <CardContent className="p-6 space-y-6">
            <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${orderProgressPercent(order.status)}%` }}
                transition={{ duration: 0.8, ease: 'easeOut' }}
                className="h-full rounded-full bg-blue-600"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              {ORDER_TRACKING_STAGES.map((stage, index) => {
                const state = trackingStageState(stage.status, order.status);
                const done = state === 'done';
                const current = state === 'current';
                return (
                  <motion.div
                    key={stage.status}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.08 }}
                    className={`rounded-xl border p-4 ${
                      done
                        ? 'border-emerald-200 bg-emerald-50'
                        : current
                          ? 'border-blue-200 bg-blue-50'
                          : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {done ? (
                        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      ) : current ? (
                        <Circle className="h-4 w-4 text-blue-600" />
                      ) : (
                        <Circle className="h-4 w-4 text-slate-300" />
                      )}
                      <p className="text-sm font-medium text-slate-900">{stage.label}</p>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <CalendarClock className="h-4 w-4" />
                  <p className="text-sm font-medium">Livraison prevue</p>
                </div>
                <p className="mt-2 text-slate-900 font-semibold">
                  {order.estimated_delivery_at
                    ? formatDate(order.estimated_delivery_at)
                    : 'Date en attente de validation par ladministration'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <div className="flex items-center gap-2 text-slate-700">
                  <CreditCard className="h-4 w-4" />
                  <p className="text-sm font-medium">Paiement</p>
                </div>
                <p className="mt-2 text-slate-900 font-semibold capitalize">
                  {order.payment?.provider || order.payment_method || 'N/A'} -{' '}
                  {order.payment?.status || 'pending'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-[1.2fr,0.8fr] gap-6">
          <Card className="border-slate-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Package className="h-5 w-5 text-slate-500" />
                Articles commandes
              </h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 space-y-2"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="min-w-0">
                        <div className="mb-1 flex items-center gap-2 flex-wrap">
                          {itemBadge(item)}
                          <Badge className={`${itemStatusClass(item.item_status)} border`}>
                            {orderItemStatusLabel(item.item_status)}
                          </Badge>
                        </div>
                        <p className="font-medium text-slate-900 truncate">{itemName(item)}</p>
                        <p className="text-sm text-slate-600">Quantite: {item.quantity}</p>
                        {item.item_type === 'formation' && (
                          <p className="text-xs text-slate-500">
                            {item.authorized_at ? 'Formation autorisee' : "En attente d autorisation"}
                          </p>
                        )}
                      </div>
                      <p className="font-semibold text-slate-900">
                        {formatPrice(item.total_price, order.currency || 'USD')}
                      </p>
                    </div>
                    <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className="h-full rounded-full bg-blue-600 transition-all"
                        style={{ width: `${orderItemProgressPercent(item.item_status)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card className="border-slate-200">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Truck className="h-5 w-5 text-slate-500" />
                Historique suivi
              </h2>
              <div className="space-y-3">
                {(order.tracking_timeline || []).map((event, index) => (
                  <motion.div
                    key={`${event.status}-${event.at}-${index}`}
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.06 }}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <p className="text-sm font-medium text-slate-900">{event.label}</p>
                    <p className="text-xs text-slate-500 mt-1">{formatDateTime(event.at)}</p>
                    {event.note && <p className="text-xs text-slate-600 mt-1">{event.note}</p>}
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
