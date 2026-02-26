'use client';

import { motion } from 'framer-motion';
import {
  TrendingUp,
  Users,
  ShoppingCart,
  BookOpen,
  DollarSign,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { useDashboardStats } from '@/hooks/useAdmin';
import { formatPrice, formatDate } from '@/lib/utils';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.4, 0, 0.2, 1],
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
          <h3 className="text-2xl font-bold text-[var(--foreground)] mt-2">{value}</h3>
          {change !== undefined && (
            <div className={`flex items-center gap-1 mt-2 text-sm ${change >= 0 ? 'text-green-500' : 'text-red-500'}`}>
              {change >= 0 ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
              <span>{Math.abs(change)}%</span>
              <span className="text-[var(--muted)]">vs mois dernier</span>
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

const COLORS = ['#2563eb', '#059669', '#d97706', '#dc2626', '#7c3aed'];

export default function DashboardPage() {
  const { data: stats, isLoading } = useDashboardStats();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
      </div>
    );
  }

  // Mock data for demonstration
  const mockRevenueData = [
    { month: 'Jan', revenue: 12500 },
    { month: 'Fév', revenue: 18200 },
    { month: 'Mar', revenue: 15800 },
    { month: 'Avr', revenue: 22400 },
    { month: 'Mai', revenue: 28900 },
    { month: 'Juin', revenue: 32100 },
    { month: 'Juil', revenue: 28600 },
    { month: 'Août', revenue: 35400 },
    { month: 'Sep', revenue: 41200 },
    { month: 'Oct', revenue: 38900 },
    { month: 'Nov', revenue: 45600 },
    { month: 'Déc', revenue: 52300 },
  ];

  const mockRevenueByType = [
    { name: 'Formations', value: 45 },
    { name: 'Produits', value: 30 },
    { name: 'Vidéos', value: 15 },
    { name: 'Documents', value: 10 },
  ];

  const mockRecentOrders = [
    { id: 'CMD-001', user: 'Jean Dupont', amount: 299, status: 'paid', date: '2026-02-24' },
    { id: 'CMD-002', user: 'Marie Martin', amount: 149, status: 'processing', date: '2026-02-24' },
    { id: 'CMD-003', user: 'Pierre Bernard', amount: 599, status: 'shipped', date: '2026-02-23' },
    { id: 'CMD-004', user: 'Sophie Petit', amount: 89, status: 'pending', date: '2026-02-23' },
    { id: 'CMD-005', user: 'Lucas Moreau', amount: 449, status: 'delivered', date: '2026-02-22' },
  ];

  const mockTopFormations = [
    { title: 'Chimie Organique Avancée', enrollments: 234, rating: 4.8 },
    { title: 'Sécurité Laboratoire', enrollments: 189, rating: 4.9 },
    { title: 'Analyse Spectrale', enrollments: 156, rating: 4.7 },
    { title: 'Synthèse Moléculaire', enrollments: 142, rating: 4.6 },
    { title: 'Chromatographie HPLC', enrollments: 128, rating: 4.8 },
  ];

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-8"
    >
      {/* Header */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Tableau de bord</h1>
          <p className="text-[var(--muted)] mt-1">Bienvenue dans votre espace administrateur</p>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm text-[var(--muted)]">{formatDate(new Date())}</span>
        </div>
      </motion.div>

      {/* KPI Cards */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KPICard
          title="Revenus Totaux"
          value={formatPrice(stats?.totalRevenue || 345800)}
          change={12.5}
          icon={DollarSign}
          color="bg-blue-500"
        />
        <KPICard
          title="Commandes"
          value={stats?.totalOrders || 1234}
          change={8.2}
          icon={ShoppingCart}
          color="bg-green-500"
        />
        <KPICard
          title="Inscriptions"
          value={stats?.totalEnrollments || 892}
          change={15.3}
          icon={BookOpen}
          color="bg-amber-500"
        />
        <KPICard
          title="Utilisateurs"
          value={stats?.totalUsers || 3456}
          change={5.7}
          icon={Users}
          color="bg-purple-500"
        />
      </motion.div>

      {/* Charts Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Revenus sur 12 mois</h3>
            <div className="flex items-center gap-2 text-sm text-[var(--muted)]">
              <Activity className="w-4 h-4" />
              <span>En temps réel</span>
            </div>
          </div>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockRevenueData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" stroke="var(--muted)" fontSize={12} />
                <YAxis stroke="var(--muted)" fontSize={12} tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                  formatter={(value: number) => formatPrice(value)}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="var(--primary)"
                  strokeWidth={3}
                  dot={{ fill: 'var(--primary)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6, strokeWidth: 0 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Revenue by Type */}
        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-6">Revenus par type</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={mockRevenueByType}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {mockRevenueByType.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--card)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-2 mt-4">
            {mockRevenueByType.map((item, index) => (
              <div key={item.name} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  <span className="text-[var(--foreground)]">{item.name}</span>
                </div>
                <span className="text-[var(--muted)]">{item.value}%</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Tables Row */}
      <motion.div variants={itemVariants} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Commandes récentes</h3>
            <button className="text-sm text-[var(--primary)] hover:underline">Voir tout</button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border)]">
                  <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">Commande</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">Client</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">Montant</th>
                  <th className="text-left py-3 px-2 text-sm font-medium text-[var(--muted)]">Statut</th>
                </tr>
              </thead>
              <tbody>
                {mockRecentOrders.map((order) => (
                  <tr key={order.id} className="border-b border-[var(--border)] last:border-0">
                    <td className="py-3 px-2 text-sm text-[var(--foreground)]">{order.id}</td>
                    <td className="py-3 px-2 text-sm text-[var(--foreground)]">{order.user}</td>
                    <td className="py-3 px-2 text-sm text-[var(--foreground)]">{formatPrice(order.amount)}</td>
                    <td className="py-3 px-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(order.status)}`}>
                        {getStatusLabel(order.status)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top Formations */}
        <div className="bg-[var(--card)] rounded-2xl p-6 border border-[var(--border)]">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">Top Formations</h3>
            <button className="text-sm text-[var(--primary)] hover:underline">Voir tout</button>
          </div>
          <div className="space-y-4">
            {mockTopFormations.map((formation, index) => (
              <div key={formation.title} className="flex items-center gap-4">
                <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center text-[var(--primary)] font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)]">{formation.title}</p>
                  <p className="text-xs text-[var(--muted)]">{formation.enrollments} inscriptions</p>
                </div>
                <div className="flex items-center gap-1">
                  <TrendingUp className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-medium text-green-500">{formation.rating}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    pending: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    paid: 'bg-green-500/10 text-green-600 border-green-500/20',
    processing: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    shipped: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
    delivered: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
    refunded: 'bg-gray-500/10 text-gray-600 border-gray-500/20',
  };
  return colors[status] || 'bg-gray-500/10 text-gray-600 border-gray-500/20';
}

function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending: 'En attente',
    paid: 'Payée',
    processing: 'En traitement',
    shipped: 'Expédiée',
    delivered: 'Livrée',
    cancelled: 'Annulée',
    refunded: 'Remboursée',
  };
  return labels[status] || status;
}
