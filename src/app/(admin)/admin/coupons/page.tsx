'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Tag,
  Percent,
  DollarSign,
  Calendar,
  Users,
  Copy,
  Trash2,
  Edit,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, formatDate } from '@/lib/utils';
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
const mockCoupons = [
  {
    id: '1',
    code: 'WELCOME20',
    discount_type: 'percentage',
    discount_value: 20,
    valid_from: '2026-01-01',
    valid_until: '2026-12-31',
    usage_limit: 100,
    usage_count: 45,
    min_order_amount: 50,
    is_active: true,
  },
  {
    id: '2',
    code: 'SUMMER50',
    discount_type: 'percentage',
    discount_value: 50,
    valid_from: '2026-06-01',
    valid_until: '2026-08-31',
    usage_limit: 50,
    usage_count: 12,
    min_order_amount: 100,
    is_active: true,
  },
  {
    id: '3',
    code: 'FIXED10',
    discount_type: 'fixed',
    discount_value: 10,
    valid_from: '2026-01-01',
    valid_until: '2026-06-30',
    usage_limit: null,
    usage_count: 89,
    min_order_amount: 0,
    is_active: false,
  },
  {
    id: '4',
    code: 'VIP30',
    discount_type: 'percentage',
    discount_value: 30,
    valid_from: '2026-02-01',
    valid_until: '2026-02-28',
    usage_limit: 20,
    usage_count: 20,
    min_order_amount: 200,
    is_active: false,
  },
];

export default function CouponsPage() {
  const [search, setSearch] = useState('');
  const [showNewCoupon, setShowNewCoupon] = useState(false);
  
  const filteredCoupons = mockCoupons.filter((c) =>
    c.code.toLowerCase().includes(search.toLowerCase())
  );

  const stats = {
    total: mockCoupons.length,
    active: mockCoupons.filter((c) => c.is_active).length,
    inactive: mockCoupons.filter((c) => !c.is_active).length,
    totalUsage: mockCoupons.reduce((acc, c) => acc + c.usage_count, 0),
  };

  const isExpired = (validUntil: string) => new Date(validUntil) < new Date();

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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Coupons</h1>
          <p className="text-[var(--muted)] mt-1">Gérez les codes promo et réductions</p>
        </div>
        <Button onClick={() => setShowNewCoupon(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouveau coupon
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total coupons</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Actifs</p>
          <p className="text-2xl font-bold text-green-500">{stats.active}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Inactifs</p>
          <p className="text-2xl font-bold text-red-500">{stats.inactive}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Utilisations</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{stats.totalUsage}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher un coupon..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </motion.div>

      {/* Coupons Grid */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {filteredCoupons.map((coupon) => {
          const expired = isExpired(coupon.valid_until);
          const usagePercentage = coupon.usage_limit
            ? (coupon.usage_count / coupon.usage_limit) * 100
            : 0;

          return (
            <div
              key={coupon.id}
              className={cn(
                'bg-[var(--card)] rounded-2xl border overflow-hidden transition-shadow hover:shadow-lg',
                coupon.is_active && !expired
                  ? 'border-[var(--border)]'
                  : 'border-red-500/30 opacity-75'
              )}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center">
                      <Tag className="w-6 h-6 text-[var(--primary)]" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-[var(--foreground)]">{coupon.code}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {coupon.is_active && !expired ? (
                          <span className="flex items-center gap-1 text-xs text-green-500">
                            <CheckCircle className="w-3 h-3" />
                            Actif
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-xs text-red-500">
                            <XCircle className="w-3 h-3" />
                            {expired ? 'Expiré' : 'Inactif'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors">
                      <Copy className="w-4 h-4 text-[var(--muted)]" />
                    </button>
                    <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors">
                      <Edit className="w-4 h-4 text-[var(--muted)]" />
                    </button>
                    <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                      <Trash2 className="w-4 h-4 text-red-500" />
                    </button>
                  </div>
                </div>

                {/* Discount */}
                <div className="flex items-center gap-2 mb-4">
                  {coupon.discount_type === 'percentage' ? (
                    <>
                      <Percent className="w-5 h-5 text-[var(--primary)]" />
                      <span className="text-2xl font-bold text-[var(--foreground)]">
                        {coupon.discount_value}%
                      </span>
                    </>
                  ) : (
                    <>
                      <DollarSign className="w-5 h-5 text-[var(--primary)]" />
                      <span className="text-2xl font-bold text-[var(--foreground)]">
                        {formatPrice(coupon.discount_value)}
                      </span>
                    </>
                  )}
                  <span className="text-sm text-[var(--muted)]">de réduction</span>
                </div>

                {/* Details */}
                <div className="space-y-2 text-sm">
                  {coupon.min_order_amount > 0 && (
                    <div className="flex items-center gap-2 text-[var(--muted)]">
                      <DollarSign className="w-4 h-4" />
                      <span>Min. {formatPrice(coupon.min_order_amount)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Calendar className="w-4 h-4" />
                    <span>
                      Du {formatDate(coupon.valid_from)} au {formatDate(coupon.valid_until)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-[var(--muted)]">
                    <Users className="w-4 h-4" />
                    <span>
                      {coupon.usage_count} utilisation{coupon.usage_count > 1 ? 's' : ''}
                      {coupon.usage_limit && ` / ${coupon.usage_limit}`}
                    </span>
                  </div>
                </div>

                {/* Usage Bar */}
                {coupon.usage_limit && (
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-[var(--muted)] mb-1">
                      <span>Utilisation</span>
                      <span>{Math.round(usagePercentage)}%</span>
                    </div>
                    <div className="h-2 bg-[var(--background)] rounded-full overflow-hidden">
                      <div
                        className={cn(
                          'h-full rounded-full transition-all',
                          usagePercentage >= 90 ? 'bg-red-500' : 'bg-[var(--primary)]'
                        )}
                        style={{ width: `${Math.min(usagePercentage, 100)}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </motion.div>

      {/* New Coupon Modal */}
      {showNewCoupon && (
        <NewCouponModal onClose={() => setShowNewCoupon(false)} />
      )}
    </motion.div>
  );
}

function NewCouponModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    code: '',
    discount_type: 'percentage',
    discount_value: 10,
    valid_from: '',
    valid_until: '',
    usage_limit: '',
    min_order_amount: 0,
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--card)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
      >
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Nouveau coupon</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--background)] rounded-lg">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Code coupon
            </label>
            <input
              type="text"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
              placeholder="EX: SUMMER20"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Type de réduction
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discount_type: 'percentage' })}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors',
                  formData.discount_type === 'percentage'
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)]'
                )}
              >
                <Percent className="w-4 h-4" />
                Pourcentage
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, discount_type: 'fixed' })}
                className={cn(
                  'flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border transition-colors',
                  formData.discount_type === 'fixed'
                    ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                    : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)]'
                )}
              >
                <DollarSign className="w-4 h-4" />
                Montant fixe
              </button>
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Valeur de la réduction
            </label>
            <input
              type="number"
              min="0"
              step={formData.discount_type === 'percentage' ? 1 : 0.01}
              max={formData.discount_type === 'percentage' ? 100 : undefined}
              value={formData.discount_value}
              onChange={(e) => setFormData({ ...formData, discount_value: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Valide du
              </label>
              <input
                type="date"
                value={formData.valid_from}
                onChange={(e) => setFormData({ ...formData, valid_from: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Valide jusqu&apos;au
              </label>
              <input
                type="date"
                value={formData.valid_until}
                onChange={(e) => setFormData({ ...formData, valid_until: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Limite d&apos;utilisation (optionnel)
            </label>
            <input
              type="number"
              min="1"
              value={formData.usage_limit}
              onChange={(e) => setFormData({ ...formData, usage_limit: e.target.value })}
              placeholder="Illimité si vide"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Montant minimum de commande
            </label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={formData.min_order_amount}
              onChange={(e) => setFormData({ ...formData, min_order_amount: parseFloat(e.target.value) })}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Annuler
            </Button>
            <Button className="flex-1">
              Créer le coupon
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
