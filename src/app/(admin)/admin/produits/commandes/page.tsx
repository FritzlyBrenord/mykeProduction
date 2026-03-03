"use client";

import { Button } from "@/components/ui/button";
import {
  ORDER_TRACKING_STAGES,
  canTransitionOrderItemStatus,
  orderItemProgressPercent,
  orderItemStatusLabel,
  orderProgressPercent,
  orderStatusLabel,
} from "@/lib/orders/tracking";
import { formatDate, formatDateTime, formatPrice } from "@/lib/utils";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CalendarDays,
  CreditCard,
  Eye,
  FlaskConical,
  PlayCircle,
  Search,
  Truck,
  User,
  XCircle,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface TrackingEvent {
  status: string;
  label: string;
  at: string;
  note?: string;
}

interface AdminOrderItem {
  id: string;
  item_type: "produit" | "formation" | "video";
  item_status: string;
  authorized_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  produit: {
    name: string | null;
    slug: string | null;
    is_digital: boolean | null;
    type: "chimique" | "document" | "autre" | null;
  } | null;
  formation: { title: string | null; slug: string | null } | null;
  video: { title: string | null; slug: string | null } | null;
}

interface AdminPayment {
  id: string;
  provider: "stripe" | "paypal";
  status: string | null;
  amount: number;
  metadata: Record<string, unknown> | null;
  created_at: string;
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
  estimated_delivery_at: string | null;
  processing_at: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  cancelled_at: string | null;
  tracking_timeline: TrackingEvent[];
  created_at: string;
  payment: AdminPayment | null;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
    role: string | null;
    country: string | null;
    bio: string | null;
    is_active: boolean | null;
    two_fa_enabled: boolean | null;
    created_at: string | null;
  } | null;
  items: AdminOrderItem[];
}

function shippingField(order: AdminOrder, key: string) {
  const value = order.shipping_address?.[key];
  return typeof value === "string" ? value : "";
}

function toInputDate(value: string | null | undefined) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
}

function getCustomerName(order: AdminOrder) {
  const shippingName =
    `${shippingField(order, "first_name")} ${shippingField(order, "last_name")}`.trim();
  return shippingName || order.user?.full_name || "Client";
}

function getItemName(item: AdminOrderItem) {
  if (item.item_type === "produit") return item.produit?.name || "Produit";
  if (item.item_type === "formation")
    return item.formation?.title || "Formation";
  return item.video?.title || "Video";
}

function getStatusClass(status: string) {
  switch (status) {
    case "paid":
      return "bg-blue-500/10 text-blue-700 border-blue-300";
    case "processing":
      return "bg-amber-500/10 text-amber-700 border-amber-300";
    case "shipped":
      return "bg-indigo-500/10 text-indigo-700 border-indigo-300";
    case "delivered":
      return "bg-green-500/10 text-green-700 border-green-300";
    case "cancelled":
      return "bg-red-500/10 text-red-700 border-red-300";
    case "refunded":
      return "bg-fuchsia-500/10 text-fuchsia-700 border-fuchsia-300";
    default:
      return "bg-slate-500/10 text-slate-700 border-slate-300";
  }
}

function paymentStateBadge(payment: AdminPayment | null) {
  if (!payment) {
    return {
      label: "Aucun paiement",
      className: "bg-slate-100 text-slate-700 border border-slate-200",
    };
  }
  if (payment.status === "success") {
    return {
      label: "Paye",
      className: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    };
  }
  if (payment.status === "failed") {
    return {
      label: "Echec",
      className: "bg-red-100 text-red-700 border border-red-200",
    };
  }
  if (payment.status === "refunded") {
    return {
      label: "Rembourse",
      className: "bg-fuchsia-100 text-fuchsia-700 border border-fuchsia-200",
    };
  }
  return {
    label: "En attente",
    className: "bg-amber-100 text-amber-800 border border-amber-200",
  };
}

function itemTypeBadge(item: AdminOrderItem) {
  if (item.item_type === "formation") {
    return "bg-blue-100 text-blue-700 border border-blue-200";
  }
  if (item.item_type === "video") {
    return "bg-purple-100 text-purple-700 border border-purple-200";
  }
  if (item.produit?.type === "chimique") {
    return "bg-amber-100 text-amber-800 border border-amber-200";
  }
  if (item.produit?.type === "document") {
    return "bg-cyan-100 text-cyan-800 border border-cyan-200";
  }
  return "bg-slate-100 text-slate-700 border border-slate-200";
}

function itemTypeLabel(item: AdminOrderItem) {
  if (item.item_type === "formation") return "Formation";
  if (item.item_type === "video") return "Video";
  if (item.produit?.type === "chimique") return "Produit chimique";
  if (item.produit?.type === "document") return "Document";
  return "Produit";
}

function isPhysicalProduct(item: AdminOrderItem) {
  return item.item_type === "produit" && item.produit?.is_digital === false;
}

function itemStatusBadgeClass(status: string) {
  if (status === "paid") return "bg-blue-100 text-blue-700 border-blue-200";
  if (status === "processing")
    return "bg-amber-100 text-amber-800 border-amber-200";
  if (status === "shipped")
    return "bg-indigo-100 text-indigo-700 border-indigo-200";
  if (status === "delivered")
    return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (status === "cancelled") return "bg-red-100 text-red-700 border-red-200";
  if (status === "refunded")
    return "bg-fuchsia-100 text-fuchsia-700 border-fuchsia-200";
  return "bg-slate-100 text-slate-700 border-slate-200";
}

function simulatedReference(payment: AdminPayment | null) {
  const value = payment?.metadata?.simulated_reference;
  return typeof value === "string" ? value : null;
}

function displayOrDash(value: string | null | undefined) {
  if (!value) return "-";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "-";
}

export default function CommandesPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [actionLoadingOrderId, setActionLoadingOrderId] = useState<
    string | null
  >(null);
  const [deliveryDateByOrder, setDeliveryDateByOrder] = useState<
    Record<string, string>
  >({});

  const syncDeliveryInputs = (nextOrders: AdminOrder[]) => {
    const nextState: Record<string, string> = {};
    nextOrders.forEach((order) => {
      nextState[order.id] = toInputDate(order.estimated_delivery_at);
    });
    setDeliveryDateByOrder(nextState);
  };

  const loadOrders = async () => {
    setLoading(true);
    try {
      const query = statusFilter
        ? `?status=${encodeURIComponent(statusFilter)}`
        : "";
      const response = await fetch(`/api/admin/commandes${query}`, {
        credentials: "include",
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Erreur chargement commandes");
      const nextOrders = Array.isArray(data) ? (data as AdminOrder[]) : [];
      setOrders(nextOrders);
      setSelectedOrder((current) => {
        if (!current) return null;
        return nextOrders.find((order) => order.id === current.id) ?? null;
      });
      syncDeliveryInputs(nextOrders);
    } catch (error) {
      console.error("Admin orders load error:", error);
      toast.error("Impossible de recuperer les commandes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return orders;
    return orders.filter((order) => {
      const customerName = getCustomerName(order).toLowerCase();
      const customerEmail = shippingField(order, "email").toLowerCase();
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
      paid: orders.filter((order) => order.status === "paid").length,
      processing: orders.filter((order) => order.status === "processing")
        .length,
      delivered: orders.filter((order) => order.status === "delivered").length,
      revenue: orders.reduce(
        (sum, order) => sum + Number(order.total_amount || 0),
        0,
      ),
    }),
    [orders],
  );

  const updateStatus = async (orderId: string, status: string) => {
    try {
      setActionLoadingOrderId(orderId);
      const payload: Record<string, unknown> = { status };
      const deliveryDate = deliveryDateByOrder[orderId];
      if (deliveryDate) {
        payload.estimatedDeliveryAt = deliveryDate;
      }

      const response = await fetch(`/api/admin/commandes/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Echec mise a jour");
      await loadOrders();
      toast.success("Statut commande mis a jour.");
    } catch (error) {
      console.error("Status update error:", error);
      toast.error("Impossible de modifier le statut.");
    } finally {
      setActionLoadingOrderId(null);
    }
  };

  const updateItemStatus = async (
    orderId: string,
    itemId: string,
    action: "authorize" | "processing" | "shipped" | "delivered",
  ) => {
    try {
      setActionLoadingOrderId(orderId);
      const payload: Record<string, unknown> = {
        itemId,
        action,
      };
      const deliveryDate = deliveryDateByOrder[orderId];
      if (deliveryDate) {
        payload.estimatedDeliveryAt = deliveryDate;
      }

      const response = await fetch(`/api/admin/commandes/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Echec mise a jour item");
      await loadOrders();
      toast.success(data?.message || "Item de commande mis a jour.");
    } catch (error) {
      console.error("Item status update error:", error);
      toast.error("Impossible de modifier ce contenu.");
    } finally {
      setActionLoadingOrderId(null);
    }
  };

  const saveEstimatedDelivery = async (orderId: string) => {
    const dateValue = deliveryDateByOrder[orderId];
    if (!dateValue) {
      toast.error("Saisissez une date de livraison.");
      return;
    }
    try {
      setActionLoadingOrderId(orderId);
      const response = await fetch(`/api/admin/commandes/${orderId}/status`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estimatedDeliveryAt: dateValue }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Echec mise a jour");
      await loadOrders();
      toast.success("Date de livraison prevue enregistree.");
    } catch (error) {
      console.error("Estimated delivery update error:", error);
      toast.error("Impossible de sauvegarder la date.");
    } finally {
      setActionLoadingOrderId(null);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">
          Commandes boutique
        </h1>
        <p className="text-[var(--muted)] mt-1">
          Controlez le paiement, la date prevue de livraison, puis les etapes
          preparation, expedition et livraison.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {stats.total}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Payees</p>
          <p className="text-2xl font-bold text-blue-600">{stats.paid}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Preparation</p>
          <p className="text-2xl font-bold text-amber-600">
            {stats.processing}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Livrees</p>
          <p className="text-2xl font-bold text-green-600">{stats.delivered}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Revenus</p>
          <p className="text-xl font-bold text-[var(--primary)]">
            {formatPrice(stats.revenue, "USD")}
          </p>
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
          <option value="processing">En preparation</option>
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
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">
                  Commande
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">
                  Client
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">
                  Contenu vendu
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">
                  Paiement
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">
                  Statut
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">
                  Livraison prevue
                </th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">
                  Total
                </th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 px-6 text-center text-[var(--muted)]"
                  >
                    Chargement des commandes...
                  </td>
                </tr>
              ) : filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="py-8 px-6 text-center text-[var(--muted)]"
                  >
                    Aucune commande trouvee.
                  </td>
                </tr>
              ) : (
                filteredOrders.map((order) => {
                  const customerName = getCustomerName(order);
                  const customerEmail = shippingField(order, "email");
                  const paymentBadge = paymentStateBadge(order.payment);
                  const paymentRef = simulatedReference(order.payment);
                  const isBusy = actionLoadingOrderId === order.id;

                  return (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50"
                    >
                      <td className="py-4 px-6 align-top">
                        <p className="font-medium text-[var(--foreground)] break-all">
                          #{order.id.split("-")[0]}
                        </p>
                        <p className="text-xs text-[var(--muted)]">
                          {formatDateTime(order.created_at)}
                        </p>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="flex items-center gap-2">
                          <User className="w-4 h-4 text-[var(--muted)] mt-0.5" />
                          <div>
                            <p className="text-sm text-[var(--foreground)]">
                              {customerName}
                            </p>
                            <p className="text-xs text-[var(--muted)] break-all">
                              {customerEmail || "-"}
                            </p>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="space-y-2">
                          {(order.items || []).slice(0, 2).map((item) => (
                            <div key={item.id} className="text-xs">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full ${itemTypeBadge(item)}`}
                              >
                                {itemTypeLabel(item)}
                              </span>
                              <span
                                className={`ml-1 inline-flex px-2 py-0.5 rounded-full border ${itemStatusBadgeClass(item.item_status)}`}
                              >
                                {orderItemStatusLabel(item.item_status)}
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
                        <div className="flex items-start gap-2">
                          <CreditCard className="w-4 h-4 text-[var(--muted)] mt-0.5" />
                          <div className="space-y-1">
                            <p className="text-xs text-[var(--foreground)] capitalize">
                              {order.payment?.provider ||
                                order.payment_method ||
                                "-"}
                            </p>
                            <span
                              className={`inline-flex rounded-full px-2 py-0.5 text-xs ${paymentBadge.className}`}
                            >
                              {paymentBadge.label}
                            </span>
                            {paymentRef && (
                              <p className="text-[10px] text-[var(--muted)] break-all">
                                Ref: {paymentRef}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusClass(order.status)}`}
                        >
                          {orderStatusLabel(order.status)}
                        </span>
                        <div className="h-1.5 mt-2 rounded-full bg-slate-200 overflow-hidden min-w-[120px]">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all"
                            style={{
                              width: `${orderProgressPercent(order.status)}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <div className="space-y-2 min-w-[180px]">
                          <div className="flex items-center gap-1 text-xs text-[var(--muted)]">
                            <CalendarDays className="h-3.5 w-3.5" />
                            <span>
                              {order.estimated_delivery_at
                                ? formatDate(order.estimated_delivery_at)
                                : "Non definie"}
                            </span>
                          </div>
                          <div className="flex gap-1">
                            <input
                              type="date"
                              value={deliveryDateByOrder[order.id] ?? ""}
                              onChange={(event) =>
                                setDeliveryDateByOrder((prev) => ({
                                  ...prev,
                                  [order.id]: event.target.value,
                                }))
                              }
                              className="w-full text-xs px-2 py-1.5 rounded border border-[var(--border)] bg-[var(--background)]"
                            />
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 px-2"
                              onClick={() => saveEstimatedDelivery(order.id)}
                              disabled={isBusy}
                            >
                              OK
                            </Button>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-4 align-top">
                        <p className="font-medium text-[var(--foreground)]">
                          {formatPrice(
                            order.total_amount,
                            order.currency || "USD",
                          )}
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

                          {(order.status === "pending" ||
                            order.status === "paid" ||
                            order.status === "processing") && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() =>
                                updateStatus(order.id, "cancelled")
                              }
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
            className="bg-[var(--card)] rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)] break-all">
                  #{selectedOrder.id.split("-")[0]}
                </h2>
                <p className="text-sm text-[var(--muted)]">
                  {formatDateTime(selectedOrder.created_at)}
                </p>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)] mb-1">Client</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {getCustomerName(selectedOrder)}
                  </p>
                  <p className="text-sm text-[var(--muted)]">
                    {shippingField(selectedOrder, "email") || "-"}
                  </p>
                </div>

                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)] mb-1">Paiement</p>
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs ${paymentStateBadge(selectedOrder.payment).className}`}
                  >
                    {paymentStateBadge(selectedOrder.payment).label}
                  </span>
                  <p className="text-sm text-[var(--muted)] mt-2 capitalize">
                    {selectedOrder.payment?.provider ||
                      selectedOrder.payment_method ||
                      "-"}
                  </p>
                </div>

                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)] mb-1">
                    Livraison prevue
                  </p>
                  <p className="font-medium text-[var(--foreground)]">
                    {selectedOrder.estimated_delivery_at
                      ? formatDate(selectedOrder.estimated_delivery_at)
                      : "Non definie"}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4 space-y-4">
                <h3 className="text-sm font-semibold text-[var(--foreground)]">
                  Informations client completes
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-[var(--muted)]">ID client</p>
                    <p className="text-[var(--foreground)] break-all">
                      {displayOrDash(selectedOrder.user?.id)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Nom complet</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(selectedOrder.user?.full_name || getCustomerName(selectedOrder))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Email commande</p>
                    <p className="text-[var(--foreground)] break-all">
                      {displayOrDash(shippingField(selectedOrder, "email"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Telephone</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(shippingField(selectedOrder, "phone"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Role compte</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(selectedOrder.user?.role)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Compte actif</p>
                    <p className="text-[var(--foreground)]">
                      {selectedOrder.user?.is_active === true
                        ? "Oui"
                        : selectedOrder.user?.is_active === false
                          ? "Non"
                          : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">2FA active</p>
                    <p className="text-[var(--foreground)]">
                      {selectedOrder.user?.two_fa_enabled === true
                        ? "Oui"
                        : selectedOrder.user?.two_fa_enabled === false
                          ? "Non"
                          : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Creation compte</p>
                    <p className="text-[var(--foreground)]">
                      {selectedOrder.user?.created_at
                        ? formatDateTime(selectedOrder.user.created_at)
                        : "-"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Pays profil</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(selectedOrder.user?.country)}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Adresse livraison</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(shippingField(selectedOrder, "address"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Ville</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(shippingField(selectedOrder, "city"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Code postal</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(shippingField(selectedOrder, "postal_code"))}
                    </p>
                  </div>
                  <div>
                    <p className="text-[var(--muted)]">Pays livraison</p>
                    <p className="text-[var(--foreground)]">
                      {displayOrDash(shippingField(selectedOrder, "country"))}
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <p className="text-[var(--muted)]">Bio profil</p>
                    <p className="text-[var(--foreground)] whitespace-pre-wrap">
                      {displayOrDash(selectedOrder.user?.bio)}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">
                    Donnees brutes adresse de livraison (JSON)
                  </p>
                  <pre className="text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] p-3 overflow-auto text-[var(--foreground)]">
                    {JSON.stringify(selectedOrder.shipping_address ?? {}, null, 2)}
                  </pre>
                </div>

                <div>
                  <p className="text-xs text-[var(--muted)] mb-1">
                    Metadonnees paiement (JSON)
                  </p>
                  <pre className="text-xs rounded-lg bg-[var(--card)] border border-[var(--border)] p-3 overflow-auto text-[var(--foreground)]">
                    {JSON.stringify(selectedOrder.payment?.metadata ?? {}, null, 2)}
                  </pre>
                </div>
              </div>

              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] p-4">
                <div className="h-2 rounded-full bg-slate-200 overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{
                      width: `${orderProgressPercent(selectedOrder.status)}%`,
                    }}
                    className="h-full rounded-full bg-blue-600"
                  />
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-4 gap-3">
                  {ORDER_TRACKING_STAGES.map((stage) => {
                    const active =
                      orderProgressPercent(selectedOrder.status) >=
                      orderProgressPercent(stage.status);
                    return (
                      <div
                        key={stage.status}
                        className="rounded-lg border border-[var(--border)] bg-[var(--card)] p-3"
                      >
                        <p
                          className={`text-xs font-medium ${active ? "text-blue-700" : "text-slate-500"}`}
                        >
                          {stage.label}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-[var(--muted)] mb-2">
                  Articles commandes
                </h3>
                <div className="space-y-2">
                  {(selectedOrder.items || []).map((item) => (
                    <div
                      key={item.id}
                      className="bg-[var(--background)] rounded-xl p-4 space-y-3"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full text-xs ${itemTypeBadge(item)}`}
                            >
                              {itemTypeLabel(item)}
                            </span>
                            <span
                              className={`inline-flex px-2 py-0.5 rounded-full border text-xs ${itemStatusBadgeClass(item.item_status)}`}
                            >
                              {orderItemStatusLabel(item.item_status)}
                            </span>
                            {item.item_type === "produit" &&
                              item.produit?.type === "chimique" && (
                                <FlaskConical className="w-4 h-4 text-amber-700" />
                              )}
                            {item.item_type === "formation" && (
                              <PlayCircle className="w-4 h-4 text-blue-700" />
                            )}
                            {isPhysicalProduct(item) && (
                              <Truck className="w-4 h-4 text-indigo-700" />
                            )}
                          </div>
                          <p className="font-medium text-[var(--foreground)] mt-1 truncate">
                            {getItemName(item)}
                          </p>
                          <p className="text-sm text-[var(--muted)]">
                            Quantite: {item.quantity}
                          </p>
                          {item.item_type === "formation" && (
                            <p className="text-xs text-[var(--muted)]">
                              {item.authorized_at
                                ? "Formation autorisee"
                                : "En attente d autorisation"}
                            </p>
                          )}
                        </div>
                        <p className="font-medium text-[var(--foreground)] shrink-0">
                          {formatPrice(
                            item.total_price,
                            selectedOrder.currency || "USD",
                          )}
                        </p>
                      </div>

                      <div className="h-1.5 rounded-full bg-slate-200 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-blue-600 transition-all"
                          style={{
                            width: `${orderItemProgressPercent(item.item_status)}%`,
                          }}
                        />
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {item.item_type === "formation" && (
                          <Button
                            size="sm"
                            className="bg-green-600 hover:bg-green-700"
                            onClick={() =>
                              updateItemStatus(
                                selectedOrder.id,
                                item.id,
                                "authorize",
                              )
                            }
                            disabled={
                              actionLoadingOrderId === selectedOrder.id ||
                              Boolean(item.authorized_at) ||
                              !canTransitionOrderItemStatus(
                                item.item_status,
                                "delivered",
                              )
                            }
                          >
                            Autoriser
                          </Button>
                        )}

                        {isPhysicalProduct(item) && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateItemStatus(
                                  selectedOrder.id,
                                  item.id,
                                  "processing",
                                )
                              }
                              disabled={
                                actionLoadingOrderId === selectedOrder.id ||
                                !canTransitionOrderItemStatus(
                                  item.item_status,
                                  "processing",
                                )
                              }
                            >
                              En preparation
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateItemStatus(
                                  selectedOrder.id,
                                  item.id,
                                  "shipped",
                                )
                              }
                              disabled={
                                actionLoadingOrderId === selectedOrder.id ||
                                !canTransitionOrderItemStatus(
                                  item.item_status,
                                  "shipped",
                                )
                              }
                            >
                              Expedier
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                updateItemStatus(
                                  selectedOrder.id,
                                  item.id,
                                  "delivered",
                                )
                              }
                              disabled={
                                actionLoadingOrderId === selectedOrder.id ||
                                !canTransitionOrderItemStatus(
                                  item.item_status,
                                  "delivered",
                                )
                              }
                            >
                              Livrer
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t border-[var(--border)] pt-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Sous-total</span>
                  <span className="text-[var(--foreground)]">
                    {formatPrice(
                      selectedOrder.subtotal,
                      selectedOrder.currency || "USD",
                    )}
                  </span>
                </div>
                {selectedOrder.discount_amount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-green-600">Remise</span>
                    <span className="text-green-600">
                      -
                      {formatPrice(
                        selectedOrder.discount_amount,
                        selectedOrder.currency || "USD",
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span className="text-[var(--muted)]">Taxes</span>
                  <span className="text-[var(--foreground)]">
                    {formatPrice(
                      selectedOrder.tax_amount,
                      selectedOrder.currency || "USD",
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-lg font-bold pt-2 border-t border-[var(--border)]">
                  <span className="text-[var(--foreground)]">Total</span>
                  <span className="text-[var(--primary)]">
                    {formatPrice(
                      selectedOrder.total_amount,
                      selectedOrder.currency || "USD",
                    )}
                  </span>
                </div>
              </div>

              {selectedOrder.tracking_timeline &&
                selectedOrder.tracking_timeline.length > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-[var(--muted)] mb-2">
                      Historique de suivi
                    </h3>
                    <div className="space-y-2">
                      {selectedOrder.tracking_timeline.map((event, index) => (
                        <div
                          key={`${event.status}-${event.at}-${index}`}
                          className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-3"
                        >
                          <p className="text-sm font-medium text-[var(--foreground)]">
                            {event.label}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {formatDateTime(event.at)}
                          </p>
                          {event.note && (
                            <p className="text-xs text-[var(--muted)] mt-1">
                              {event.note}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              <div className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>
                  Workflow separe par item: autoriser chaque formation, puis
                  gerer chaque produit physique avec En preparation, Expedier,
                  Livrer.
                </p>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
