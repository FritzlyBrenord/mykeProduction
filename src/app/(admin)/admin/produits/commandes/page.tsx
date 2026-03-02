'use client';

import { Button } from '@/components/ui/button';
import { formatDateTime, formatPrice } from '@/lib/utils';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  CheckCircle,
  CreditCard,
  Eye,
  FlaskConical,
  PlayCircle,
  Search,
  Truck,
  User,
  XCircle,
} from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

interface AdminOrderItem {
  id: string;
  item_type: 'produit' | 'formation' | 'video';
  quantity: number;
  unit_price: number;
  total_price: number;
  produit: {
    name: string | null;
    slug: string | null;
    is_digital: boolean | null;
    type: 'chimique' | 'document' | 'autre' | null;
  } | null;
  formation: { title: string | null; slug: string | null } | null;
  video: { title: string | null; slug: string | null } | null;
}

interface AdminOrder {
  id: string;
  status: string;
  subtotal: number;
  discount_amount: number;
  tax_amount: number;
  total_amount: number;
  currency: string;
  payment_method: string | null;
  shipping_address: Record<string, unknown> | null;
  created_at: string;
  user: { full_name: string | null } | null;
  items: AdminOrderItem[];
}

function shippingField(order: AdminOrder, key: string) {
  const value = order.shipping_address?.[key];
  return typeof value === 'string' ? value : '';
}

function getCustomerName(order: AdminOrder) {
  const shippingName = `${shippingField(order, 'first_name')} ${shippingField(order, 'last_name')}`.trim();
  return shippingName || order.user?.full_name || 'Client';
}

function getItemName(item: AdminOrderItem) {
  if (item.item_type === 'produit') return item.produit?.name || 'Produit';
  if (item.item_type === 'formation') return item.formation?.title || 'Formation';
  return item.video?.title || 'Video';
}

function getStatusLabel(status: string) {
  switch (status) {
    case 'pending':
      return 'En attente';
    case 'paid':
      return 'Payee';
    case 'processing':
      return 'En traitement';
    case 'shipped':
      return 'Expediee';
    case 'delivered':
      return 'Livree';
    case 'cancelled':
      return 'Annulee';
    case 'refunded':
      return 'Remboursee';
    default:
      return status;
  }
}

function getStatusClass(status: string) {
  switch (status) {
    case 'paid':
      return 'bg-blue-500/10 text-blue-700 border-blue-300';
    case 'processing':
      return 'bg-amber-500/10 text-amber-700 border-amber-300';
    case 'shipped':
      return 'bg-indigo-500/10 text-indigo-700 border-indigo-300';
    case 'delivered':
      return 'bg-green-500/10 text-green-700 border-green-300';
    case 'cancelled':
      return 'bg-red-500/10 text-red-700 border-red-300';
    default:
      return 'bg-slate-500/10 text-slate-700 border-slate-300';
  }
}

function itemTypeBadge(item: AdminOrderItem) {
  if (item.item_type === 'formation') {
    return 'bg-blue-100 text-blue-700 border border-blue-200';
  }
  if (item.item_type === 'video') {
    return 'bg-purple-100 text-purple-700 border border-purple-200';
  }
  if (item.produit?.type === 'chimique') {
    return 'bg-amber-100 text-amber-800 border border-amber-200';
  }
  return 'bg-slate-100 text-slate-700 border border-slate-200';
}

function itemTypeLabel(item: AdminOrderItem) {
  if (item.item_type === 'formation') return 'Formation';
  if (item.item_type === 'video') return 'Video';
  if (item.produit?.type === 'chimique') return 'Produit chimique';
  return 'Produit';
}

function isFormationOrder(order: AdminOrder) {
  return order.items?.some((item) => item.item_type === 'formation');
}

function isChemicalPhysicalOrder(order: AdminOrder) {
  return order.items?.some(
    (item) =>
      item.item_type === 'produit' &&
      item.produit?.type === 'chimique' &&
      item.produit?.is_digital === false,
  );
}

function nextChemicalStatus(status: string) {
  if (status === 'paid') return 'processing';
  if (status === 'processing') return 'shipped';
  if (status === 'shipped') return 'delivered';
  return null;
}

function nextChemicalStatusLabel(status: string) {
  if (status === 'processing') return 'Mettre en traitement';
  if (status === 'shipped') return 'Marquer expediee';
  if (status === 'delivered') return 'Marquer livree';
  return null;
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [actionLoadingOrderId, setActionLoadingOrderId] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const loadOrders = async () => {
      try {
        setLoading(true);
        const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
        const response = await fetch(`/api/admin/commandes${query}`, {
          credentials: 'include',
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || 'Erreur chargement commandes');
        if (!active) return;
        setOrders(Array.isArray(data) ? (data as AdminOrder[]) : []);
      } catch (error) {
        console.error('Admin orders load error:', error);
        toast.error("Impossible de recuperer les commandes.");
      } finally {
        if (active) setLoading(false);
      }
    };
    loadOrders();
    return () => {
      active = false;
    };
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const customerName = getCustomerName(order).toLowerCase();
      const customerEmail = shippingField(order, 'email').toLowerCase();
      const hasItemMatch = (order.items || []).some((item) =>
        getItemName(item).toLowerCase().includes(query),
      );
      return (
        order.id.toLowerCase().includes(query) ||
        customerName.includes(query) ||
        customerEmail.includes(query) ||
        hasItemMatch
      );
    });
  }, [orders, search]);

  const stats = useMemo(
    () => ({
      total: orders.length,
      paid: orders.filter((order) => order.status === 'paid').length,
      processing: orders.filter((order) => order.status === 'processing').length,
      delivered: orders.filter((order) => order.status === 'delivered').length,
      revenue: orders.reduce((sum, order) => sum + Number(order.total_amount || 0), 0),
    }),
    [orders],
  );

  const refreshOrders = async () => {
    const query = statusFilter ? `?status=${encodeURIComponent(statusFilter)}` : '';
    const response = await fetch(`/api/admin/commandes${query}`, {
      credentials: 'include',
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || 'Erreur chargement commandes');
    setOrders(Array.isArray(data) ? (data as AdminOrder[]) : []);
  };

  const updateStatus = async (orderId: string, status: string) => {
    try {
      setActionLoadingOrderId(orderId);
      const response = await fetch(`/api/admin/commandes/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Echec mise a jour');
      await refreshOrders();
      toast.success('Statut commande mis a jour.');
    } catch (error) {
      console.error('Status update error:', error);
      toast.error("Impossible de modifier le statut.");
    } finally {
      setActionLoadingOrderId(null);
    }
  };

  const authorizeOrder = async (orderId: string) => {
    try {
      setActionLoadingOrderId(orderId);
      const response = await fetch(`/api/admin/commandes/${orderId}/status`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ authorize: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Echec de l'autorisation");
      await refreshOrders();
      toast.success(data?.message || 'Formation autorisee et email envoye.');
    } catch (error) {
      console.error('Authorize order error:', error);
      toast.error("Impossible d'autoriser la formation.");
    } finally {
      setActionLoadingOrderId(null);
    }
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Commandes</h1>
        <p className="text-[var(--muted)] mt-1">
          Visualisez exactement ce qui a ete vendu et traitez les commandes par type d&apos;article.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Payees</p>
          <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Traitement</p>
          <p className="text-2xl font-bold text-amber-600">{stats.processing}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Livrees</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Revenus</p>
          <p className="text-xl font-bold text-[var(--primary)]">{formatPrice(stats.revenue, 'USD')}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher commande, client, produit, formation..."
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
          <option value="paid">Payee</option>
          <option value="processing">En traitement</option>
          <option value="shipped">Expediee</option>
          <option value="delivered">Livree</option>
          <option value="cancelled">Annulee</option>
          <option value="refunded">Remboursee</option>
        </select>
      </div>

      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Commande</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Client</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Contenu vendu</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Paiement</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Total</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-[var(--muted)]">
                    Chargement des commandes...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 px-6 text-center text-[var(--muted)]">
                    Aucune commande trouvee.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customerName = getCustomerName(order);
                  const customerEmail = shippingField(order, 'email');
                  const hasFormation = isFormationOrder(order);
                  const hasChemicalPhysical = isChemicalPhysicalOrder(order);
                  const nextStatus = hasChemicalPhysical ? nextChemicalStatus(order.status) : null;
                  const nextStatusText = nextStatus ? nextChemicalStatusLabel(nextStatus) : null;
                  const isBusy = actionLoadingOrderId === order.id;

                  return (
                    <tr key={order.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50">
                      <td className="py-4 px-6 align-top">
                        <p className="font-medium text-[var(--foreground)] break-all">{order.id}</p>
                        <p className="text-xs text-[var(--muted)]">{formatDateTime(order.created_at)}</p>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[var(--muted)] mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--foreground)]">{customerName}</p>
                            <p className="text-xs text-[var(--muted)] break-all">{customerEmail || '-'}</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="space-y-2">
                          {(order.items || []).slice(0, 2).map((item) => (
                            <div key={item.id} className="text-xs">
                              <span className={`inline-flex px-2 py-0.5 rounded-full ${itemTypeBadge(item)}`}>
                                {itemTypeLabel(item)}
                              </span>
                              <p className="mt-1 text-[var(--foreground)]">
                                {getItemName(item)} x{item.quantity}
                              </p>
                            </div>
                          ))}
                          {(order.items || []).length > 2 && (
                            <p className="text-xs text-[var(--muted)]">
                              +{(order.items || []).length - 2} autre(s)
                            </p>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <CreditCard className="w-4 h-4 text-[var(--muted)]" />
                          <div>
                            <p className="text-sm text-[var(--foreground)] capitalize">
                              {order.payment_method || '-'}
                            </p>
                            <p className="text-xs text-green-700 font-medium">Paiement confirme</p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(order.status)}`}>
                          {getStatusLabel(order.status)}
                        </span>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <p className="font-medium text-[var(--foreground)]">
                          {formatPrice(order.total_amount, order.currency || 'USD')}
                        </p>
                      </td>

                      <td className="py-4 px-6 align-top">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <button
                            onClick={() => setSelectedOrder(order)}
                            className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                            title="Voir details"
                          >
                            <Eye className="w-4 h-4 text-[var(--muted)]" />
                          </button>

                          {hasFormation && ['paid', 'processing'].includes(order.status) && (
                            <Button
                              size="sm"
                              onClick={() => authorizeOrder(order.id)}
                              disabled={isBusy}
                              className="bg-green-600 hover:bg-green-700"
                            >
                              <CheckCircle className="w-4 h-4 mr-1" />
                              Autoriser
                            </Button>
                          )}

                          {hasChemicalPhysical && nextStatus && nextStatusText && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateStatus(order.id, nextStatus)}
                              disabled={isBusy}
                            >
                              {nextStatusText}
                            </Button>
                          )}

                          {(order.status === 'paid' || order.status === 'pending') && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => updateStatus(order.id, 'cancelled')}
                              disabled={isBusy}
                            >
                              <XCircle className="w-4 h-4 mr-1" />
                              Annuler
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card)] rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)] break-all">{selectedOrder.id}</h2>
                <p className="text-sm text-[var(--muted)]">{formatDateTime(selectedOrder.created_at)}</p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)] mb-1">Client</p>
                  <p className="font-medium text-[var(--foreground)]">{getCustomerName(selectedOrder)}</p>
                  <p className="text-sm text-[var(--muted)]">{shippingField(selectedOrder, 'email') || '-'}</p>
                </div>

                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)] mb-1">Statut</p>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(selectedOrder.status)}`}>
                    {getStatusLabel(selectedOrder.status)}
                  </span>
                  <p className="text-sm text-green-700 mt-2">Paiement confirme</p>
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">Details des articles vendus</h3>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item) => (
                    <div key={item.id} className="flex items-center justify-between bg-[var(--background)] rounded-xl p-4 gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex px-2 py-0.5 rounded-full text-xs ${itemTypeBadge(item)}`}>
                            {itemTypeLabel(item)}
                          </span>
                          {item.item_type === 'produit' && item.produit?.type === 'chimique' && (
                            <FlaskConical className="w-4 h-4 text-amber-700" />
                          )}
                          {item.item_type === 'formation' && <PlayCircle className="w-4 h-4 text-blue-700" />}
                          {item.item_type === 'produit' && !item.produit?.is_digital && <Truck className="w-4 h-4 text-indigo-700" />}
                        </div>
                        <p className="font-medium text-[var(--foreground)] mt-1 truncate">{getItemName(item)}</p>
                        <p className="text-sm text-[var(--muted)]">Quantite: {item.quantity}</p>
                      </div>
                      <p className="font-medium text-[var(--foreground)] shrink-0">
                        {formatPrice(item.total_price, selectedOrder.currency || 'USD')}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Sous-total</span>
                  <span className="text-[var(--foreground)]">{formatPrice(selectedOrder.subtotal, selectedOrder.currency || 'USD')}</span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Remise</span>
                    <span className="text-green-600">-{formatPrice(selectedOrder.discount_amount, selectedOrder.currency || 'USD')}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Taxes</span>
                  <span className="text-[var(--foreground)]">{formatPrice(selectedOrder.tax_amount, selectedOrder.currency || 'USD')}</span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--foreground)]">Total</span>
                  <span className="text-[var(--primary)]">{formatPrice(selectedOrder.total_amount, selectedOrder.currency || 'USD')}</span>
                </div>
              </div>

              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Regle metier appliquee: formation = bouton Autoriser; produit chimique physique = workflow
                  traitement puis expedition puis livraison.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
