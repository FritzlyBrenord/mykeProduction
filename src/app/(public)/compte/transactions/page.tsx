'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatDateTime, formatPrice } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import { AlertCircle, CreditCard, History, ReceiptText, RefreshCw } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type TransactionStatus = 'pending' | 'success' | 'failed' | 'refunded';

interface TransactionRow {
  id: string;
  order_id: string | null;
  amount: number;
  provider: 'stripe' | 'paypal';
  status: TransactionStatus;
  created_at: string;
  metadata: Record<string, unknown> | null;
  order: {
    id: string;
    status: string;
    currency: string;
    total_amount: number;
    created_at: string;
  } | null;
}

const STATUS_CLASS: Record<TransactionStatus, string> = {
  pending: 'bg-amber-100 text-amber-800 border-amber-200',
  success: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  refunded: 'bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200',
};

const STATUS_LABEL: Record<TransactionStatus, string> = {
  pending: 'En attente',
  success: 'Reussie',
  failed: 'Echouee',
  refunded: 'Remboursee',
};

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<TransactionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = async (silent: boolean) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const response = await fetch('/api/transactions', {
        credentials: 'include',
        cache: 'no-store',
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Erreur chargement transactions');
      }
      setTransactions(Array.isArray(data) ? (data as TransactionRow[]) : []);
    } catch (error) {
      console.error('Transactions load error:', error);
      toast.error("Impossible de recuperer l'historique des transactions.");
    } finally {
      if (silent) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void loadTransactions(false);
  }, []);

  const stats = useMemo(() => {
    const total = transactions.length;
    const success = transactions.filter((t) => t.status === 'success').length;
    const pending = transactions.filter((t) => t.status === 'pending').length;
    const refunded = transactions.filter((t) => t.status === 'refunded').length;
    return { total, success, pending, refunded };
  }, [transactions]);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-100 via-white to-slate-100 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl border border-blue-200 bg-gradient-to-r from-slate-900 via-slate-800 to-blue-800 p-6 md:p-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white">Mes transactions</h1>
          <p className="text-slate-200 mt-2">
            Suivi detaille de tous vos paiements et remboursements.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4"
        >
          <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">Total</p><p className="text-3xl font-bold text-slate-900 mt-1">{stats.total}</p></CardContent></Card>
          <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">Reussies</p><p className="text-3xl font-bold text-emerald-700 mt-1">{stats.success}</p></CardContent></Card>
          <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">En attente</p><p className="text-3xl font-bold text-amber-700 mt-1">{stats.pending}</p></CardContent></Card>
          <Card className="border-slate-200"><CardContent className="p-5"><p className="text-sm text-slate-500">Remboursees</p><p className="text-3xl font-bold text-fuchsia-700 mt-1">{stats.refunded}</p></CardContent></Card>
        </motion.div>

        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => void loadTransactions(true)}
            disabled={refreshing}
            className="border-slate-300 text-slate-800"
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
            {refreshing ? 'Actualisation...' : 'Actualiser'}
          </Button>
        </div>

        {loading ? (
          <Card className="border-slate-200">
            <CardContent className="p-10 text-center text-slate-600">
              Chargement des transactions...
            </CardContent>
          </Card>
        ) : transactions.length > 0 ? (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            {transactions.map((tx) => (
              <Card key={tx.id} className="border-slate-200 shadow-sm">
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <Badge className={`border ${STATUS_CLASS[tx.status]}`}>{STATUS_LABEL[tx.status]}</Badge>
                        <Badge className="bg-blue-100 text-blue-700 border-blue-200 uppercase">
                          Carte
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-500">Transaction #{tx.id.slice(0, 8)}</p>
                      <p className="text-sm text-slate-600 mt-1">
                        {formatDateTime(tx.created_at)}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Commande: {tx.order_id ? `#${tx.order_id.slice(0, 8)}` : 'N/A'}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-slate-900">
                        {formatPrice(tx.amount, tx.order?.currency || 'USD')}
                      </p>
                      {tx.order_id ? (
                        <Link href={`/compte/commandes/${tx.order_id}`}>
                          <Button variant="outline">
                            <ReceiptText className="h-4 w-4 mr-2" />
                            Voir commande
                          </Button>
                        </Link>
                      ) : null}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </motion.div>
        ) : (
          <Card className="border-slate-200">
            <CardContent className="p-12 text-center">
              <History className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Aucune transaction</h2>
              <p className="text-slate-600 mb-6">
                Vos paiements apparaitront ici apres votre premier achat.
              </p>
              <div className="flex justify-center gap-3">
                <Link href="/checkout">
                  <Button className="bg-slate-900 hover:bg-slate-800 text-white">
                    <CreditCard className="h-4 w-4 mr-2" />
                    Aller au checkout
                  </Button>
                </Link>
                <Link href="/compte/commandes">
                  <Button variant="outline">Voir mes commandes</Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>
            Les transactions sont verifiees cote serveur avant validation definitive.
          </p>
        </div>
      </div>
    </div>
  );
}
