"use client";

import { motion, type Variants } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  DollarSign,
  ShoppingCart,
  TrendingUp,
  Users,
} from "lucide-react";
import { useDashboardStats } from "@/hooks/useAdmin";
import { formatDate, formatPrice } from "@/lib/utils";
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type DashboardPayload = {
  totalRevenue: number;
  totalOrders: number;
  totalEnrollments: number;
  totalUsers: number;
  kpiChanges?: {
    revenue: number;
    orders: number;
    enrollments: number;
    users: number;
  };
  revenueByMonth: Array<{ month: string; revenue: number }>;
  revenueByType: Array<{ type: string; value: number }>;
  recentOrders: Array<{
    id: string;
    status: string;
    amount: number;
    created_at: string;
    user?: { full_name: string | null } | null;
  }>;
  topFormations: Array<{
    id: string;
    title: string;
    enrollments: number;
    rating: number;
  }>;
};

const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut",
    },
  },
};

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  icon: React.ElementType;
  color: string;
}

function KPICard({ title, value, change, icon: Icon, color }: KPICardProps) {
  return (
    <motion.div
      variants={itemVariants}
      className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)] shadow-sm hover:shadow-md transition-shadow"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-[var(--muted)]">{title}</p>
          <h3 className="text-2xl font-bold text-[var(--foreground)] mt-2">
            {value}
          </h3>
          {change !== undefined && (
            <div
              className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? "text-green-500" : "text-red-500"}`}
            >
              {change >= 0 ? (
                <ArrowUpRight className="w-4 h-4" />
              ) : (
                <ArrowDownRight className="w-4 h-4" />
              )}
              <span>{Math.abs(change)}%</span>
              <span className="text-[var(--muted)]">vs mois precedent</span>
            </div>
          )}
        </div>
        <div className={`p-3 rounded-xl ${color}`}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </motion.div>
  );
}

const COLORS = ["#2563eb", "#059669", "#d97706", "#dc2626", "#7c3aed"];
const CHART_COLORS = {
  grid: "hsl(var(--border, 222 25% 25%))",
  axis: "hsl(var(--muted-foreground, 40 10% 65%))",
  line: "hsl(var(--primary, 43 55% 58%))",
  tooltipBg: "hsl(var(--card, 222 35% 15%))",
  tooltipBorder: "hsl(var(--border, 222 25% 25%))",
  tooltipText: "hsl(var(--foreground, 40 20% 98%))",
};

export default function DashboardPage() {
  const { data: rawStats, isLoading, isError, error } = useDashboardStats();

  const stats = (rawStats || null) as DashboardPayload | null;
  const revenueByMonth = stats?.revenueByMonth || [];
  const revenueByType = stats?.revenueByType || [];
  const recentOrders = stats?.recentOrders || [];
  const topFormations = stats?.topFormations || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6">
        <p className="font-semibold text-red-500">Erreur dashboard</p>
        <p className="text-sm text-red-400 mt-1">
          {error instanceof Error
            ? error.message
            : "Impossible de charger les statistiques."}
        </p>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      <motion.div
        variants={itemVariants}
        className="flex items-center justify-between"
      >
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Tableau de bord
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Donnees admin en temps reel
          </p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--muted)]">
            {formatDate(new Date())}
          </span>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
      >
        <KPICard
          title="Revenus Totaux"
          value={formatPrice(stats?.totalRevenue || 0)}
          change={stats?.kpiChanges?.revenue}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <KPICard
          title="Commandes"
          value={stats?.totalOrders || 0}
          change={stats?.kpiChanges?.orders}
          icon={ShoppingCart}
          color="bg-green-500"
        />
        <KPICard
          title="Inscriptions"
          value={stats?.totalEnrollments || 0}
          change={stats?.kpiChanges?.enrollments}
          icon={BookOpen}
          color="bg-amber-500"
        />
        <KPICard
          title="Utilisateurs"
          value={stats?.totalUsers || 0}
          change={stats?.kpiChanges?.users}
          icon={Users}
          color="bg-purple-500"
        />
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-3 gap-6"
      >
        <div className="lg:col-span-2 bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Revenus sur 12 mois
            </h3>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Activity className="w-4 h-4" />
              <span>Mis a jour automatiquement</span>
            </div>
          </div>
          <div className="h-80">
            {revenueByMonth.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--muted)]">
                Pas encore de donnees de revenus.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenueByMonth}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke={CHART_COLORS.grid}
                  />
                  <XAxis
                    dataKey="month"
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={{ stroke: CHART_COLORS.grid }}
                  />
                  <YAxis
                    stroke={CHART_COLORS.axis}
                    tick={{ fill: CHART_COLORS.axis, fontSize: 12 }}
                    axisLine={{ stroke: CHART_COLORS.grid }}
                    tickLine={{ stroke: CHART_COLORS.grid }}
                    tickFormatter={(value) => `${value / 1000}k`}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.tooltipBg,
                      border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                      borderRadius: "8px",
                      color: CHART_COLORS.tooltipText,
                    }}
                    labelStyle={{ color: CHART_COLORS.tooltipText }}
                    itemStyle={{ color: CHART_COLORS.tooltipText }}
                    formatter={(value) => formatPrice(Number(value ?? 0))}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke={CHART_COLORS.line}
                    strokeWidth={3}
                    dot={{
                      fill: CHART_COLORS.line,
                      stroke: CHART_COLORS.tooltipBg,
                      strokeWidth: 2,
                      r: 4,
                    }}
                    activeDot={{
                      r: 6,
                      fill: CHART_COLORS.line,
                      stroke: CHART_COLORS.tooltipBg,
                      strokeWidth: 2,
                    }}
                  />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-6">
            Revenus par type
          </h3>
          <div className="h-64">
            {revenueByType.length === 0 ? (
              <div className="h-full flex items-center justify-center text-sm text-[var(--muted)]">
                Pas encore de repartition disponible.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={revenueByType}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {revenueByType.map((entry, index) => (
                      <Cell
                        key={`${entry.type}-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: CHART_COLORS.tooltipBg,
                      border: `1px solid ${CHART_COLORS.tooltipBorder}`,
                      borderRadius: "8px",
                      color: CHART_COLORS.tooltipText,
                    }}
                    labelStyle={{ color: CHART_COLORS.tooltipText }}
                    itemStyle={{ color: CHART_COLORS.tooltipText }}
                    formatter={(value) => `${Number(value ?? 0)}%`}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
          <div className="space-y-2 mt-4">
            {revenueByType.map((item, index) => (
              <div
                key={item.type}
                className="flex items-center justify-between text-sm"
              >
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-[var(--foreground)]">{item.type}</span>
                </div>
                <span className="text-[var(--muted)]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      <motion.div
        variants={itemVariants}
        className="grid grid-cols-1 lg:grid-cols-2 gap-6"
      >
        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Commandes recentes
            </h3>
          </div>
          {recentOrders.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Aucune commande pour le moment.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">
                      Commande
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">
                      Client
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">
                      Montant
                    </th>
                    <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">
                      Statut
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {recentOrders.map((order) => (
                    <tr
                      key={order.id}
                      className="border-b border-[var(--border)] last:border-0"
                    >
                      <td className="py-3 px-2 text-sm text-[var(--foreground)]">
                        #{order.id.split("-")[0]}
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--foreground)]">
                        {order.user?.full_name || "Client"}
                      </td>
                      <td className="py-3 px-2 text-sm text-[var(--foreground)]">
                        {formatPrice(order.amount)}
                      </td>
                      <td className="py-3 px-2">
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}
                        >
                          {getStatusLabel(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">
              Top Formations
            </h3>
          </div>
          {topFormations.length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Aucune formation populaire pour le moment.
            </p>
          ) : (
            <div className="space-y-4">
              {topFormations.map((formation, index) => (
                <div key={formation.id} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-semibold text-sm">
                    {index + 1}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)]">
                      {formation.title}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {formation.enrollments} inscriptions
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <TrendingUp className="w-4 h-4 text-green-500" />
                    <span className="text-sm font-medium text-green-500">
                      {formation.rating}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: "bg-yellow-500/10 text-yellow-600 border-yellow-500/20",
    paid: "bg-green-500/10 text-green-600 border-green-500/20",
    processing: "bg-blue-500/10 text-blue-600 border-blue-500/20",
    shipped: "bg-purple-500/10 text-purple-600 border-purple-500/20",
    delivered: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20",
    cancelled: "bg-red-500/10 text-red-600 border-red-500/20",
    refunded: "bg-gray-500/10 text-gray-600 border-gray-500/20",
  };
  return colors[status] || "bg-gray-500/10 text-gray-600 border-gray-500/20";
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: "En attente",
    paid: "Payee",
    processing: "En traitement",
    shipped: "Expediee",
    delivered: "Livree",
    cancelled: "Annulee",
    refunded: "Remboursee",
  };
  return labels[status] || status;
}
