"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  BadgeCheck,
  CreditCard,
  Download,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  ShieldCheck,
  ShoppingBag,
  TriangleAlert,
  Wallet,
  ChevronDown,
  ChevronUp,
  Printer,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatDateTime, formatPrice } from "@/lib/utils";

type ItemType = "produit" | "formation" | "video";
type PaymentStatus = "pending" | "success" | "failed" | "refunded";
type PaymentProvider = "stripe" | "paypal";

interface PaymentTransaction {
  id: string;
  user_id: string | null;
  commande_id: string | null;
  amount: number;
  provider: PaymentProvider;
  status: PaymentStatus;
  metadata: Record<string, unknown> | null;
  created_at: string;
  customer: {
    id: string | null;
    full_name: string | null;
    email: string | null;
  };
  order: {
    id: string | null;
    status: string | null;
    total_amount: number | null;
    currency: string | null;
    created_at: string | null;
  };
  items: Array<{
    item_type: ItemType;
    label: string;
    quantity: number;
    total_price: number;
    product_type: "chimique" | "document" | "autre" | null;
    is_digital: boolean | null;
  }>;
  summary: {
    item_types: ItemType[];
    total_quantity: number;
    total_items_amount: number;
    contains_physical_product: boolean;
  };
}

interface ApiResponse {
  data: PaymentTransaction[];
  meta?: { total?: number };
}

const statusConfig: Record<
  PaymentStatus,
  { label: string; className: string; icon: typeof BadgeCheck }
> = {
  pending: {
    label: "En attente",
    className: "bg-amber-500/12 text-amber-600 border-amber-500/30",
    icon: TriangleAlert,
  },
  success: {
    label: "Réussi",
    className: "bg-emerald-500/12 text-emerald-600 border-emerald-500/30",
    icon: BadgeCheck,
  },
  failed: {
    label: "Échoué",
    className: "bg-red-500/12 text-red-600 border-red-500/30",
    icon: TriangleAlert,
  },
  refunded: {
    label: "Remboursé",
    className: "bg-blue-500/12 text-blue-600 border-blue-500/30",
    icon: RefreshCw,
  },
};

const providerConfig: Record<
  PaymentProvider,
  { label: string; className: string; badge: string }
> = {
  stripe: {
    label: "Stripe",
    className: "bg-violet-500/12 text-violet-600 border-violet-500/30",
    badge: "ST",
  },
  paypal: {
    label: "PayPal",
    className: "bg-sky-500/12 text-sky-600 border-sky-500/30",
    badge: "PP",
  },
};

const itemTypeConfig: Record<ItemType, { label: string; className: string }> = {
  produit: {
    label: "Produit",
    className: "bg-zinc-500/12 text-zinc-600 border-zinc-500/30",
  },
  formation: {
    label: "Formation",
    className: "bg-indigo-500/12 text-indigo-600 border-indigo-500/30",
  },
  video: {
    label: "Vidéo",
    className: "bg-fuchsia-500/12 text-fuchsia-600 border-fuchsia-500/30",
  },
};

function normalizeStatus(value: unknown): PaymentStatus {
  if (value === "success" || value === "failed" || value === "pending" || value === "refunded") {
    return value;
  }
  return "pending";
}

function customerLabel(payment: PaymentTransaction) {
  return payment.customer.full_name || payment.customer.email || "Client";
}

function csvEscape(value: string) {
  if (value.includes(",") || value.includes("\"") || value.includes("\n")) {
    return `"${value.replace(/"/g, "\"\"")}"`;
  }
  return value;
}

function formatShortId(id: string | null | undefined, prefix: string) {
  if (!id) return "N/A";
  return `${prefix}${id.slice(0, 8)}`;
}

function TransactionRow({ transaction }: { transaction: PaymentTransaction }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const status = statusConfig[transaction.status];
  const provider = providerConfig[transaction.provider];
  const StatusIcon = status.icon;

  const handlePrintTransaction = () => {
    // Open a temporary printable window with just this content
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Recu - ${formatShortId(transaction.id, "P")}</title>
        <style>
          body { font-family: system-ui, -apple-system, sans-serif; color: #1e293b; padding: 40px; }
          .header { border-bottom: 2px solid #e2e8f0; padding-bottom: 20px; margin-bottom: 20px; }
          .title { font-size: 24px; font-weight: bold; margin: 0 0 10px 0; }
          .subtitle { font-size: 14px; color: #64748b; margin: 0; }
          .row { display: flex; justify-content: space-between; margin-bottom: 12px; }
          .label { font-weight: 600; color: #475569; }
          .value { color: #0f172a; }
          .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          .table th, .table td { padding: 12px; text-align: left; border-bottom: 1px solid #e2e8f0; }
          .table th { background: #f8fafc; font-weight: 600; color: #475569; }
          .total { margin-top: 20px; text-align: right; font-size: 20px; font-weight: bold; padding-top: 20px; border-top: 2px solid #e2e8f0; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1 class="title">Recu de Paiement</h1>
          <p class="subtitle">Genere le ${new Date().toLocaleString('fr-FR')}</p>
        </div>
        
        <div class="row">
          <span class="label">Reference Paiement:</span>
          <span class="value">${transaction.id} (${formatShortId(transaction.id, "P")})</span>
        </div>
        <div class="row">
          <span class="label">Reference Commande:</span>
          <span class="value">${transaction.commande_id || "N/A"} (${formatShortId(transaction.commande_id, "#")})</span>
        </div>
        <div class="row">
          <span class="label">Date:</span>
          <span class="value">${formatDateTime(transaction.created_at)}</span>
        </div>
        <div class="row">
          <span class="label">Client:</span>
          <span class="value">${customerLabel(transaction)} ${transaction.customer.email ? `(${transaction.customer.email})` : ''}</span>
        </div>
        <div class="row">
          <span class="label">Methode:</span>
          <span class="value">${provider.label}</span>
        </div>
        <div class="row">
          <span class="label">Statut:</span>
          <span class="value">${status.label}</span>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Type</th>
              <th>Article</th>
              <th>Qte</th>
              <th style="text-align: right;">Total</th>
            </tr>
          </thead>
          <tbody>
            ${transaction.items.map(item => `
              <tr>
                <td>${itemTypeConfig[item.item_type].label}</td>
                <td>${item.label}</td>
                <td>${item.quantity}</td>
                <td style="text-align: right;">${formatPrice(item.total_price)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="total">
          Montant paye: ${formatPrice(Number(transaction.amount || 0))}
        </div>
      </body>
      <script>
        window.onload = function() { window.print(); window.close(); }
      </script>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <article className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-4 transition hover:border-[var(--primary)]/40 print:border-none print:shadow-none print:p-0 print:mb-4">
      <div 
        className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between cursor-pointer group"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="space-y-2 flex-grow">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-[var(--foreground)]" title={transaction.id}>
              {formatShortId(transaction.id, "P")}
            </span>
            <span className="text-xs text-[var(--muted)]" title={transaction.commande_id || ""}>
              {formatShortId(transaction.commande_id, "#")}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                status.className,
              )}
            >
              <StatusIcon className="h-3.5 w-3.5" />
              {status.label}
            </span>
            <span
              className={cn(
                "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium",
                provider.className,
              )}
            >
              <span className="inline-flex h-4 w-4 items-center justify-center rounded bg-white/70 text-[10px] font-bold">
                {provider.badge}
              </span>
              {provider.label}
            </span>
            <div className="ml-auto lg:hidden">
              {isExpanded ? <ChevronUp className="h-4 w-4 text-[var(--muted)]" /> : <ChevronDown className="h-4 w-4 text-[var(--muted)]" />}
            </div>
          </div>

          <p className="text-sm text-[var(--foreground)]">
            {customerLabel(transaction)}
            {transaction.customer.email ? (
              <span className="ml-2 text-xs text-[var(--muted)]">
                ({transaction.customer.email})
              </span>
            ) : null}
          </p>
        </div>

        <div className="flex items-start gap-4 justify-between lg:justify-end">
          <div className="space-y-1 text-left lg:text-right">
            <p className="text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
              {formatPrice(Number(transaction.amount || 0))}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {formatDateTime(transaction.created_at)}
            </p>
          </div>
          <div className="hidden lg:flex items-center justify-center pt-2">
            {isExpanded ? <ChevronUp className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" /> : <ChevronDown className="h-5 w-5 text-[var(--muted)] group-hover:text-[var(--primary)] transition-colors" />}
          </div>
        </div>
      </div>

      {isExpanded && (
        <motion.div 
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          className="mt-4 pt-4 border-t border-[var(--border)] print:block"
        >
          <div className="flex justify-between items-center mb-4 print:hidden">
             <h4 className="text-sm font-semibold text-[var(--foreground)]">Details de la transaction</h4>
             <Button variant="outline" size="sm" className="h-8 gap-2" onClick={(e) => { e.stopPropagation(); handlePrintTransaction(); }}>
               <Printer className="h-3.5 w-3.5" /> Imprimer le recu
             </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
            <div className="space-y-3">
               <div>
                 <span className="text-[var(--muted)] block text-xs">ID Complet</span>
                 <span className="font-mono text-xs">{transaction.id}</span>
               </div>
               {transaction.commande_id && (
                 <div>
                   <span className="text-[var(--muted)] block text-xs">Commande ID Complet</span>
                   <span className="font-mono text-xs">{transaction.commande_id}</span>
                 </div>
               )}
            </div>

            <div className="space-y-3">
               <div className="p-3 bg-[var(--card)] rounded-lg border border-[var(--border)]">
                 <div className="flex justify-between items-center mb-2">
                   <span className="text-[var(--muted)] font-medium">Contenu de l'achat</span>
                   <div className="flex flex-wrap gap-1.5 justify-end">
                      {transaction.summary.item_types.length > 0 ? (
                        transaction.summary.item_types.map((type) => (
                          <span
                            key={`${transaction.id}-badge-${type}`}
                            className={cn(
                              "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                              itemTypeConfig[type].className,
                            )}
                          >
                            {itemTypeConfig[type].label}
                          </span>
                        ))
                      ) : (
                        <span className="rounded-full border border-zinc-300 px-2 py-0.5 text-[10px] text-zinc-500">
                          Sans article
                        </span>
                      )}
                    </div>
                 </div>

                 {transaction.items.length > 0 ? (
                    <div className="space-y-2 mt-3">
                      {transaction.items.map((item, idx) => (
                        <div key={idx} className="flex justify-between items-start text-xs border-t border-[var(--border)] pt-2 mt-2 first:border-0 first:pt-0 first:mt-0">
                          <span className="text-[var(--foreground)]">{item.label} <span className="text-[var(--muted)]">x{item.quantity}</span></span>
                          <span className="font-medium whitespace-nowrap ml-2">{formatPrice(item.total_price)}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-center pt-3 border-t border-[var(--border)] mt-3">
                         <span className="font-medium text-[var(--muted)]">Total lignes:</span>
                         <span className="font-bold">{formatPrice(transaction.summary.total_items_amount)}</span>
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--muted)] mt-2">Aucun detail d'article disponible.</p>
                  )}
               </div>
            </div>
          </div>
        </motion.div>
      )}
    </article>
  );
}

export default function PaiementsPage() {
  const [transactions, setTransactions] = useState<PaymentTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"" | PaymentStatus>("");
  const [providerFilter, setProviderFilter] = useState<"" | PaymentProvider>("");
  const [typeFilter, setTypeFilter] = useState<"" | ItemType>("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/admin/paiements", {
        method: "GET",
        credentials: "include",
        cache: "no-store",
      });

      const payload = (await response.json().catch(() => null)) as
        | ApiResponse
        | { error?: string }
        | null;

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? payload.error || "Erreur chargement paiements"
            : "Erreur chargement paiements",
        );
      }

      const rows = payload && "data" in payload && Array.isArray(payload.data) ? payload.data : [];
      setTransactions(
        rows.map((row) => ({
          ...row,
          status: normalizeStatus(row.status),
        })),
      );
    } catch (fetchError) {
      setError(
        fetchError instanceof Error
          ? fetchError.message
          : "Impossible de récupérer les paiements.",
      );
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadTransactions();
  }, []);

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      if (statusFilter && transaction.status !== statusFilter) return false;
      if (providerFilter && transaction.provider !== providerFilter) return false;
      if (typeFilter && !transaction.summary.item_types.includes(typeFilter)) return false;

      const haystack = [
        transaction.id,
        transaction.commande_id || "",
        customerLabel(transaction),
        transaction.customer.email || "",
        ...transaction.items.map((item) => item.label),
      ]
        .join(" ")
        .toLowerCase();

      if (search && !haystack.includes(search.toLowerCase().trim())) return false;
      return true;
    });
  }, [providerFilter, search, statusFilter, transactions, typeFilter]);

  useEffect(() => {
    setPage(1);
  }, [search, statusFilter, providerFilter, typeFilter, pageSize]);

  const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / pageSize));
  const currentPage = Math.min(page, totalPages);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const paginatedTransactions = useMemo(() => {
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize;
    return filteredTransactions.slice(from, to);
  }, [currentPage, filteredTransactions, pageSize]);

  const stats = useMemo(() => {
    const total = filteredTransactions.length;
    const successRows = filteredTransactions.filter((row) => row.status === "success");
    const failedRows = filteredTransactions.filter((row) => row.status === "failed");
    const refundedRows = filteredTransactions.filter((row) => row.status === "refunded");
    const pendingRows = filteredTransactions.filter((row) => row.status === "pending");

    const successAmount = successRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const refundedAmount = refundedRows.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const netAmount = successAmount - refundedAmount;
    const successRate = total > 0 ? Math.round((successRows.length / total) * 100) : 0;
    const totalItemQuantity = filteredTransactions.reduce(
      (sum, row) => sum + (row.summary.total_quantity || 0),
      0,
    );

    const typeSummary = filteredTransactions.reduce(
      (acc, row) => {
        row.items.forEach((item) => {
          const bucket = acc[item.item_type];
          bucket.count += item.quantity || 1;
          bucket.amount += Number(item.total_price || 0);
        });
        return acc;
      },
      {
        produit: { count: 0, amount: 0 },
        formation: { count: 0, amount: 0 },
        video: { count: 0, amount: 0 },
      } as Record<ItemType, { count: number; amount: number }>,
    );

    const typesTotalAmount = 
      typeSummary.produit.amount + 
      typeSummary.formation.amount + 
      typeSummary.video.amount;

    const feesAmount = successAmount - typesTotalAmount;

    return {
      total,
      successCount: successRows.length,
      failedCount: failedRows.length,
      pendingCount: pendingRows.length,
      refundedCount: refundedRows.length,
      successAmount,
      refundedAmount,
      netAmount,
      successRate,
      totalItemQuantity,
      typeSummary,
      feesAmount,
    };
  }, [filteredTransactions]);

  const exportCsv = () => {
    if (filteredTransactions.length === 0) return;

    const headers = [
      "transaction_id",
      "commande_id",
      "client",
      "email",
      "provider",
      "status",
      "amount",
      "item_types",
      "items",
      "created_at",
    ];

    const lines = filteredTransactions.map((row) => {
      const itemTypes = row.summary.item_types.map((type) => itemTypeConfig[type].label).join("|");
      const items = row.items.map((item) => `${itemTypeConfig[item.item_type].label}:${item.label}x${item.quantity}`).join(" / ");
      return [
        row.id,
        row.commande_id || "",
        customerLabel(row),
        row.customer.email || "",
        providerConfig[row.provider].label,
        statusConfig[row.status].label,
        String(Number(row.amount || 0)),
        itemTypes,
        items,
        row.created_at,
      ]
        .map((value) => csvEscape(value))
        .join(",");
    });

    const csv = [headers.join(","), ...lines].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);

    const link = document.createElement("a");
    link.href = url;
    link.download = `paiements-admin-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleGlobalPrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 print:space-y-0 print:p-0">
      <motion.section
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[linear-gradient(130deg,hsl(var(--card))_0%,hsl(var(--background))_45%,hsl(var(--card))_100%)] p-6 shadow-sm"
      >
        <div className="pointer-events-none absolute -right-10 -top-14 h-44 w-44 rounded-full bg-emerald-500/10 blur-2xl" />
        <div className="pointer-events-none absolute -left-12 bottom-0 h-44 w-44 rounded-full bg-blue-500/10 blur-2xl" />

        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[var(--foreground)]">Pilotage des paiements</h1>
            <p className="mt-1 text-[var(--muted)]">
              Transactions réussies, statuts, montants, types d&apos;achat et actions réalisées.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 print:hidden">
            <Button variant="outline" className="gap-2" onClick={() => void loadTransactions()}>
              <RefreshCw className="h-4 w-4" />
              Actualiser
            </Button>
            <Button variant="outline" className="gap-2" onClick={handleGlobalPrint} disabled={filteredTransactions.length === 0}>
              <Printer className="h-4 w-4" />
              Imprimer la liste
            </Button>
            <Button className="gap-2" onClick={exportCsv} disabled={filteredTransactions.length === 0}>
              <Download className="h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5"
      >
        <StatCard
          label="Transactions"
          value={String(stats.total)}
          icon={CreditCard}
          tone="slate"
          subtitle="Total filtré"
        />
        <StatCard
          label="Réussies"
          value={`${stats.successCount} (${stats.successRate}%)`}
          icon={ShieldCheck}
          tone="emerald"
          subtitle={formatPrice(stats.successAmount)}
        />
        <StatCard
          label="Net encaissé"
          value={formatPrice(stats.netAmount)}
          icon={Wallet}
          tone="blue"
          subtitle={`Remboursé: ${formatPrice(stats.refundedAmount)}`}
        />
        <StatCard
          label="Échecs / En attente"
          value={`${stats.failedCount} / ${stats.pendingCount}`}
          icon={TriangleAlert}
          tone="amber"
          subtitle={`Remboursés: ${stats.refundedCount}`}
        />
        <StatCard
          label="Unités vendues"
          value={String(stats.totalItemQuantity)}
          icon={ShoppingBag}
          tone="violet"
          subtitle="Somme des quantités"
        />
      </motion.section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="grid grid-cols-1 gap-4 lg:grid-cols-12 print:block print:w-full"
      >
        <div className="lg:col-span-8 space-y-4 print:w-full print:block">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 print:hidden">
            <div className="mb-3 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[var(--muted)]" />
              <p className="text-sm font-medium text-[var(--foreground)]">Filtres</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]" />
                <input
                  type="text"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Client, transaction, commande, article..."
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--background)] py-2.5 pl-10 pr-3 text-sm text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(event) => setStatusFilter(event.target.value as "" | PaymentStatus)}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">Tous statuts</option>
                <option value="success">Réussi</option>
                <option value="pending">En attente</option>
                <option value="failed">Échoué</option>
                <option value="refunded">Remboursé</option>
              </select>
              <select
                value={providerFilter}
                onChange={(event) => setProviderFilter(event.target.value as "" | PaymentProvider)}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="">Tous providers</option>
                <option value="stripe">Stripe</option>
                <option value="paypal">PayPal</option>
              </select>
              <select
                value={typeFilter}
                onChange={(event) => setTypeFilter(event.target.value as "" | ItemType)}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] md:col-span-2"
              >
                <option value="">Tous types d&apos;achat</option>
                <option value="produit">Produit</option>
                <option value="formation">Formation</option>
                <option value="video">Vidéo</option>
              </select>
              <select
                value={String(pageSize)}
                onChange={(event) => setPageSize(Number(event.target.value))}
                className="rounded-xl border border-[var(--border)] bg-[var(--background)] px-3 py-2.5 text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] md:col-span-2"
              >
                <option value="10">10 / page</option>
                <option value="20">20 / page</option>
                <option value="50">50 / page</option>
              </select>
            </div>
          </div>

          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-semibold text-[var(--foreground)]">Transactions détaillées</h2>
              <span className="text-xs text-[var(--muted)]">
                {filteredTransactions.length} ligne(s) • page {currentPage}/{totalPages}
              </span>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16 text-[var(--muted)]">
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Chargement...
              </div>
            ) : error ? (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
                {error}
              </div>
            ) : filteredTransactions.length === 0 ? (
              <div className="py-16 text-center text-sm text-[var(--muted)]">
                Aucune transaction ne correspond aux filtres.
              </div>
            ) : (
              <div className="space-y-3 print:space-y-2">
                {paginatedTransactions.map((transaction) => (
                  <TransactionRow key={transaction.id} transaction={transaction} />
                ))}

                {totalPages > 1 && (
                  <div className="mt-4 flex flex-col gap-3 border-t border-[var(--border)] pt-4 sm:flex-row sm:items-center sm:justify-between">
                    <p className="text-xs text-[var(--muted)]">
                      Affichage{" "}
                      {(currentPage - 1) * pageSize + 1}-
                      {Math.min(currentPage * pageSize, filteredTransactions.length)} sur{" "}
                      {filteredTransactions.length}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                        disabled={currentPage <= 1}
                      >
                        Précédent
                      </Button>
                      <span className="text-xs text-[var(--muted)]">
                        {currentPage}/{totalPages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                        disabled={currentPage >= totalPages}
                      >
                        Suivant
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-4 space-y-4 print:hidden">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
            <h3 className="mb-3 font-semibold text-[var(--foreground)]">Répartition des ventes</h3>
            <div className="space-y-2">
              {(Object.keys(itemTypeConfig) as ItemType[]).map((type) => (
                <div key={type} className="rounded-xl border border-[var(--border)] bg-[var(--background)] p-3">
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-full border px-2 py-0.5 text-xs font-medium",
                        itemTypeConfig[type].className,
                      )}
                    >
                      {itemTypeConfig[type].label}
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      {stats.typeSummary[type].count}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Montant lignes: {formatPrice(stats.typeSummary[type].amount)}
                  </p>
                </div>
              ))}

              {stats.feesAmount > 0 && (
                <div className="rounded-xl border border-[var(--border)] border-dashed bg-[var(--background)] p-3 mt-4 opacity-80">
                  <div className="flex items-center justify-between">
                    <span className="rounded-full border px-2 py-0.5 text-xs font-medium bg-zinc-500/10 text-zinc-600 border-zinc-500/20">
                      Livraison / Taxes
                    </span>
                    <span className="text-sm font-semibold text-[var(--foreground)]">
                      -
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Frais annexes: {formatPrice(stats.feesAmount)}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </motion.section>
    </div>
  );
}

function StatCard({
  label,
  value,
  subtitle,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  subtitle: string;
  icon: typeof CreditCard;
  tone: "slate" | "emerald" | "blue" | "amber" | "violet";
}) {
  const toneClass: Record<typeof tone, string> = {
    slate: "bg-slate-500/10 text-slate-600",
    emerald: "bg-emerald-500/10 text-emerald-600",
    blue: "bg-blue-500/10 text-blue-600",
    amber: "bg-amber-500/10 text-amber-600",
    violet: "bg-violet-500/10 text-violet-600",
  };

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">{label}</p>
        <span
          className={cn(
            "inline-flex h-8 w-8 items-center justify-center rounded-lg",
            toneClass[tone],
          )}
        >
          <Icon className="h-4 w-4" />
        </span>
      </div>
      <p className="text-2xl font-bold text-[var(--foreground)]">{value}</p>
      <p className="mt-1 text-xs text-[var(--muted)]">{subtitle}</p>
    </div>
  );
}
