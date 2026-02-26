'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Package,
  Truck,
  CheckCircle,
  XCircle,
  RotateCcw,
  Eye,
  Download,
  CreditCard,
  Calendar,
  User,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDateTime, getStatusColor, getStatusLabel } from '@/lib/utils';
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
const mockCommandes = [
  {
    id: 'CMD-2026-0001',
    user: { full_name: 'Jean Dupont', email: 'jean@example.com' },
    status: 'paid',
    subtotal: 299.99,
    discount_amount: 0,
    tax_amount: 29.99,
    total_amount: 329.98,
    currency: 'USD',
    payment_method: 'stripe',
    items: [
      { name: 'Acide sulfurique 95%', quantity: 2, unit_price: 99.99 },
      { name: 'Guide de sécurité', quantity: 1, unit_price: 99.99 },
    ],
    created_at: '2026-02-24T10:30:00Z',
  },
  {
    id: 'CMD-2026-0002',
    user: { full_name: 'Marie Martin', email: 'marie@example.com' },
    status: 'processing',
    subtotal: 149.99,
    discount_amount: 15,
    tax_amount: 13.5,
    total_amount: 148.49,
    currency: 'USD',
    payment_method: 'paypal',
    items: [
      { name: 'Éthanol absolu', quantity: 1, unit_price: 89.99 },
      { name: 'Bécher 500ml', quantity: 5, unit_price: 12 },
    ],
    created_at: '2026-02-24T14:15:00Z',
  },
  {
    id: 'CMD-2026-0003',
    user: { full_name: 'Pierre Bernard', email: 'pierre@example.com' },
    status: 'shipped',
    subtotal: 599.99,
    discount_amount: 60,
    tax_amount: 54,
    total_amount: 593.99,
    currency: 'USD',
    payment_method: 'stripe',
    items: [
      { name: 'Pack chimie complète', quantity: 1, unit_price: 599.99 },
    ],
    created_at: '2026-02-23T09:00:00Z',
  },
  {
    id: 'CMD-2026-0004',
    user: { full_name: 'Sophie Petit', email: 'sophie@example.com' },
    status: 'pending',
    subtotal: 89.99,
    discount_amount: 0,
    tax_amount: 9,
    total_amount: 98.99,
    currency: 'USD',
    payment_method: null,
    items: [
      { name: 'Formation sécurité labo', quantity: 1, unit_price: 89.99 },
    ],
    created_at: '2026-02-23T16:45:00Z',
  },
  {
    id: 'CMD-2026-0005',
    user: { full_name: 'Lucas Moreau', email: 'lucas@example.com' },
    status: 'delivered',
    subtotal: 449.99,
    discount_amount: 45,
    tax_amount: 40.5,
    total_amount: 445.49,
    currency: 'USD',
    payment_method: 'paypal',
    items: [
      { name: 'Microscope électronique', quantity: 1, unit_price: 449.99 },
    ],
    created_at: '2026-02-22T11:20:00Z',
  },
];

const statusFlow = ['pending', 'paid', 'processing', 'shipped', 'delivered'];

export default function CommandesPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedCommande, setSelectedCommande] = useState<typeof mockCommandes[0] | null>(null);
  
  const filteredCommandes = mockCommandes.filter((cmd) => {
    if (statusFilter && cmd.status !== statusFilter) return false;
    if (search && !cmd.id.toLowerCase().includes(search.toLowerCase()) && 
        !cmd.user.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockCommandes.length,
    pending: mockCommandes.filter((c) => c.status === 'pending').length,
    paid: mockCommandes.filter((c) => c.status === 'paid').length,
    processing: mockCommandes.filter((c) => c.status === 'processing').length,
    shipped: mockCommandes.filter((c) => c.status === 'shipped').length,
    delivered: mockCommandes.filter((c) => c.status === 'delivered').length,
    revenue: mockCommandes.reduce((acc, c) => acc + c.total_amount, 0),
  };

  const canAdvanceStatus = (currentStatus: string) => {
    const currentIndex = statusFlow.indexOf(currentStatus);
    return currentIndex < statusFlow.length - 1 ? statusFlow[currentIndex + 1] : null;
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Commandes</h1>
        <p className="text-[var(--muted)] mt-1">Gérez les commandes et leur statut</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">En attente</p>
          <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Payées</p>
          <p className="text-2xl font-bold text-green-500">{stats.paid}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">En traitement</p>
          <p className="text-2xl font-bold text-blue-500">{stats.processing}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Expédiées</p>
          <p className="text-2xl font-bold text-purple-500">{stats.shipped}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Livrées</p>
          <p className="text-2xl font-bold text-emerald-500">{stats.delivered}</p>
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
            placeholder="Rechercher une commande..."
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
          <option value="pending">En attente</option>
          <option value="paid">Payée</option>
          <option value="processing">En traitement</option>
          <option value="shipped">Expédiée</option>
          <option value="delivered">Livrée</option>
          <option value="cancelled">Annulée</option>
          <option value="refunded">Remboursée</option>
        </select>
      </motion.div>

      {/* Commandes Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Commande</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Client</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Paiement</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Total</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Date</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCommandes.map((commande) => (
                <tr key={commande.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-lg flex items-center justify-center">
                        <Package className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{commande.id}</p>
                        <p className="text-xs text-[var(--muted)]">{commande.items.length} article(s)</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-[var(--muted)]" />
                      <div>
                        <p className="text-sm text-[var(--foreground)]">{commande.user.full_name}</p>
                        <p className="text-xs text-[var(--muted)]">{commande.user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(commande.status))}>
                      {getStatusLabel(commande.status)}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {commande.payment_method ? (
                      <div className="flex items-center gap-2">
                        <CreditCard className="w-4 h-4 text-[var(--muted)]" />
                        <span className="text-sm text-[var(--foreground)] capitalize">
                          {commande.payment_method}
                        </span>
                      </div>
                    ) : (
                      <span className="text-sm text-[var(--muted)]">-</span>
                    )}
                  </td>
                  <td className="py-4 px-4">
                    <p className="font-medium text-[var(--foreground)]">
                      {formatPrice(commande.total_amount)}
                    </p>
                    {commande.discount_amount > 0 && (
                      <p className="text-xs text-green-500">
                        -{formatPrice(commande.discount_amount)}
                      </p>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-[var(--muted)]">
                    {formatDateTime(commande.created_at)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedCommande(commande)}
                        className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4 text-[var(--muted)]" />
                      </button>
                      {canAdvanceStatus(commande.status) && (
                        <button
                          className="p-2 hover:bg-green-500/10 rounded-lg transition-colors"
                          title="Avancer le statut"
                        >
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        </button>
                      )}
                      <button
                        className="p-2 hover:bg-red-500/10 rounded-lg transition-colors"
                        title="Annuler"
                      >
                        <XCircle className="w-4 h-4 text-red-500" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Commande Detail Modal */}
      {selectedCommande && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">{selectedCommande.id}</h2>
                <p className="text-sm text-[var(--muted)]">{formatDateTime(selectedCommande.created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedCommande(null)}
                className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              {/* Client Info */}
              <div>
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Client</h3>
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="font-medium text-[var(--foreground)]">{selectedCommande.user.full_name}</p>
                  <p className="text-sm text-[var(--muted)]">{selectedCommande.user.email}</p>
                </div>
              </div>
              
              {/* Items */}
              <div>
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Articles</h3>
                <div className="space-y-2">
                  {selectedCommande.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-[var(--background)] rounded-xl p-4">
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{item.name}</p>
                        <p className="text-sm text-[var(--muted)]">Qté: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-[var(--foreground)]">
                        {formatPrice(item.unit_price * item.quantity)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
              
              {/* Totals */}
              <div className="border-t border-[var(--border)] pt-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted)]">Sous-total</span>
                    <span className="text-[var(--foreground)]">{formatPrice(selectedCommande.subtotal)}</span>
                  </div>
                  {selectedCommande.discount_amount > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-green-500">Remise</span>
                      <span className="text-green-500">-{formatPrice(selectedCommande.discount_amount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-sm">
                    <span className="text-[var(--muted)]">Taxes</span>
                    <span className="text-[var(--foreground)]">{formatPrice(selectedCommande.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border)]">
                    <span className="text-[var(--foreground)]">Total</span>
                    <span className="text-[var(--primary)]">{formatPrice(selectedCommande.total_amount)}</span>
                  </div>
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex gap-3">
                <Button className="flex-1 gap-2">
                  <Download className="w-4 h-4" />
                  Facture
                </Button>
                {canAdvanceStatus(selectedCommande.status) && (
                  <Button variant="outline" className="flex-1 gap-2">
                    <Truck className="w-4 h-4" />
                    {getStatusLabel(canAdvanceStatus(selectedCommande.status)!)}
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
