'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  CreditCard,
  CheckCircle,
  XCircle,
  RotateCcw,
  Download,
  TrendingUp,
  Calendar,
  DollarSign,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDateTime } from '@/lib/utils';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Mock data
const mockPaiements = [
  {
    id: 'PAY-001',
    user: { full_name: 'Jean Dupont', email: 'jean@example.com' },
    commande_id: 'CMD-2026-0001',
    amount: 329.98,
    provider: 'stripe',
    status: 'success',
    created_at: '2026-02-24T10:35:00Z',
  },
  {
    id: 'PAY-002',
    user: { full_name: 'Marie Martin', email: 'marie@example.com' },
    commande_id: 'CMD-2026-0002',
    amount: 148.49,
    provider: 'paypal',
    status: 'success',
    created_at: '2026-02-24T14:20:00Z',
  },
  {
    id: 'PAY-003',
    user: { full_name: 'Pierre Bernard', email: 'pierre@example.com' },
    commande_id: 'CMD-2026-0003',
    amount: 593.99,
    provider: 'stripe',
    status: 'success',
    created_at: '2026-02-23T09:05:00Z',
  },
  {
    id: 'PAY-004',
    user: { full_name: 'Sophie Petit', email: 'sophie@example.com' },
    commande_id: 'CMD-2026-0004',
    amount: 98.99,
    provider: 'stripe',
    status: 'failed',
    created_at: '2026-02-23T16:50:00Z',
  },
  {
    id: 'PAY-005',
    user: { full_name: 'Lucas Moreau', email: 'lucas@example.com' },
    commande_id: 'CMD-2026-0005',
    amount: 445.49,
    provider: 'paypal',
    status: 'refunded',
    created_at: '2026-02-22T11:25:00Z',
  },
];

const providerIcons = {
  stripe: (
    <div className="w-8 h-8 bg-purple-500/10 rounded-lg flex items-center justify-center">
      <span className="text-purple-500 font-bold text-xs">ST</span>
    </div>
  ),
  paypal: (
    <div className="w-8 h-8 bg-blue-500/10 rounded-lg flex items-center justify-center">
      <span className="text-blue-500 font-bold text-xs">PP</span>
    </div>
  ),
};

export default function PaiementsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  
  const filteredPaiements = mockPaiements.filter((p) => {
    if (statusFilter && p.status !== statusFilter) return false;
    if (search && !p.user.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockPaiements.length,
    success: mockPaiements.filter((p) => p.status === 'success').length,
    failed: mockPaiements.filter((p) => p.status === 'failed').length,
    refunded: mockPaiements.filter((p) => p.status === 'refunded').length,
    revenue: mockPaiements
      .filter((p) => p.status === 'success')
      .reduce((acc, p) => acc + p.amount, 0),
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Paiements</h1>
          <p className="text-[var(--muted)] mt-1">Suivi des transactions et remboursements</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total transactions</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Réussis</p>
          <p className="text-2xl font-bold text-green-500">{stats.success}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Échoués</p>
          <p className="text-2xl font-bold text-red-500">{stats.failed}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Remboursés</p>
          <p className="text-2xl font-bold text-amber-500">{stats.refunded}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Revenus</p>
          <p className="text-xl font-bold text-[var(--primary)]">{formatPrice(stats.revenue)}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher un paiement..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les statuts</option>
          <option value="success">Réussi</option>
          <option value="failed">Échoué</option>
          <option value="refunded">Remboursé</option>
          <option value="pending">En attente</option>
        </select>
      </motion.div>

      {/* Paiements Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Transaction</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Client</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Méthode</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Montant</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Date</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredPaiements.map((paiement) => (
                <tr key={paiement.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center">
                        <CreditCard className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{paiement.id}</p>
                        <p className="text-xs text-[var(--muted)]">{paiement.commande_id}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <p className="text-sm text-[var(--foreground)]">{paiement.user.full_name}</p>
                    <p className="text-xs text-[var(--muted)]">{paiement.user.email}</p>
                  </td>
                  <td className="py-4 px-4">
                    {providerIcons[paiement.provider as keyof typeof providerIcons]}
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-[var(--foreground)]">{formatPrice(paiement.amount)}</p>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(paiement.status))}>
                      {getStatusLabel(paiement.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4 text-sm text-[var(--muted)]">
                    {formatDateTime(paiement.created_at)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      {paiement.status === 'success' && (
                        <button
                          className="p-2 hover:bg-amber-500/10 rounded-lg transition-colors"
                          title="Rembourser"
                        >
                          <RotateCcw className="w-4 h-4 text-amber-500" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    success: 'bg-green-500/10 text-green-600 border-green-500/20',
    failed: 'bg-red-500/10 text-red-600 border-red-500/20',
    refunded: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    success: 'Réussi',
    failed: 'Échoué',
    refunded: 'Remboursé',
  };
  return labels[status] || status;
}
