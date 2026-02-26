'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Filter,
  Shield,
  User,
  Database,
  Edit,
  Trash2,
  Plus,
  LogIn,
  LogOut,
  CreditCard,
  Download,
  FileDown,
  Lock,
  Unlock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDateTime } from '@/lib/utils';
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
const mockAuditLogs = [
  {
    id: '1',
    user: { full_name: 'Jean Dupont', email: 'jean@example.com' },
    action: 'login',
    table_name: null,
    record_id: null,
    ip_address: '192.168.1.100',
    created_at: '2026-02-24T10:30:00Z',
  },
  {
    id: '2',
    user: { full_name: 'Jean Dupont', email: 'jean@example.com' },
    action: 'create',
    table_name: 'formations',
    record_id: 'f-123',
    ip_address: '192.168.1.100',
    created_at: '2026-02-24T10:35:00Z',
  },
  {
    id: '3',
    user: { full_name: 'Marie Martin', email: 'marie@example.com' },
    action: 'update',
    table_name: 'produits',
    record_id: 'p-456',
    ip_address: '192.168.1.101',
    created_at: '2026-02-24T11:20:00Z',
  },
  {
    id: '4',
    user: { full_name: 'Jean Dupont', email: 'jean@example.com' },
    action: 'delete',
    table_name: 'articles',
    record_id: 'a-789',
    ip_address: '192.168.1.100',
    created_at: '2026-02-24T12:00:00Z',
  },
  {
    id: '5',
    user: { full_name: 'Sophie Petit', email: 'sophie@example.com' },
    action: 'payment',
    table_name: 'commandes',
    record_id: 'cmd-001',
    ip_address: '192.168.1.102',
    created_at: '2026-02-24T14:15:00Z',
  },
  {
    id: '6',
    user: { full_name: 'Lucas Moreau', email: 'lucas@example.com' },
    action: '2fa_enable',
    table_name: 'profiles',
    record_id: 'prof-005',
    ip_address: '192.168.1.103',
    created_at: '2026-02-24T15:30:00Z',
  },
  {
    id: '7',
    user: { full_name: 'Jean Dupont', email: 'jean@example.com' },
    action: 'session_revoke',
    table_name: 'user_sessions',
    record_id: 'sess-abc',
    ip_address: '192.168.1.100',
    created_at: '2026-02-24T16:00:00Z',
  },
];

const actionConfig: Record<string, { label: string; icon: any; color: string }> = {
  create: { label: 'Création', icon: Plus, color: 'text-green-500 bg-green-500/10' },
  update: { label: 'Modification', icon: Edit, color: 'text-blue-500 bg-blue-500/10' },
  delete: { label: 'Suppression', icon: Trash2, color: 'text-red-500 bg-red-500/10' },
  login: { label: 'Connexion', icon: LogIn, color: 'text-purple-500 bg-purple-500/10' },
  logout: { label: 'Déconnexion', icon: LogOut, color: 'text-gray-500 bg-gray-500/10' },
  payment: { label: 'Paiement', icon: CreditCard, color: 'text-amber-500 bg-amber-500/10' },
  export: { label: 'Export', icon: FileDown, color: 'text-cyan-500 bg-cyan-500/10' },
  '2fa_enable': { label: '2FA Activé', icon: Lock, color: 'text-emerald-500 bg-emerald-500/10' },
  '2fa_disable': { label: '2FA Désactivé', icon: Unlock, color: 'text-orange-500 bg-orange-500/10' },
  session_revoke: { label: 'Session révoquée', icon: LogOut, color: 'text-red-500 bg-red-500/10' },
};

export default function AuditLogsPage() {
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState<string>('');
  
  const filteredLogs = mockAuditLogs.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (search && !log.user.full_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Audit Logs</h1>
          <p className="text-[var(--muted)] mt-1">Journal des actions administrateurs (lecture seule)</p>
        </div>
        <Button variant="outline" className="gap-2">
          <Download className="w-4 h-4" />
          Export CSV
        </Button>
      </motion.div>

      {/* Info Banner */}
      <motion.div variants={itemVariants} className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-medium text-blue-600">Journal d&apos;audit immuable</p>
          <p className="text-sm text-blue-500/80 mt-1">
            Ces logs sont enregistrés à des fins de sécurité et de conformité. 
            Ils ne peuvent pas être modifiés ou supprimés.
          </p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher par utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={actionFilter}
          onChange={(e) => setActionFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Toutes les actions</option>
          <option value="create">Création</option>
          <option value="update">Modification</option>
          <option value="delete">Suppression</option>
          <option value="login">Connexion</option>
          <option value="logout">Déconnexion</option>
          <option value="payment">Paiement</option>
          <option value="2fa_enable">2FA Activé</option>
          <option value="session_revoke">Session révoquée</option>
        </select>
      </motion.div>

      {/* Logs Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Action</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Utilisateur</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Table</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">ID</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">IP</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Date</th>
              </tr>
            </thead>
            <tbody>
              {filteredLogs.map((log) => {
                const config = actionConfig[log.action] || { 
                  label: log.action, 
                  icon: Shield, 
                  color: 'text-gray-500 bg-gray-500/10' 
                };
                const ActionIcon = config.icon;

                return (
                  <tr key={log.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', config.color)}>
                          <ActionIcon className="w-4 h-4" />
                        </div>
                        <span className="font-medium text-[var(--foreground)]">{config.label}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <User className="w-4 h-4 text-[var(--muted)]" />
                        <span className="text-sm text-[var(--foreground)]">{log.user.full_name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {log.table_name ? (
                        <div className="flex items-center gap-2">
                          <Database className="w-4 h-4 text-[var(--muted)]" />
                          <span className="text-sm text-[var(--foreground)]">{log.table_name}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      {log.record_id ? (
                        <span className="text-sm font-mono text-[var(--foreground)]">{log.record_id}</span>
                      ) : (
                        <span className="text-sm text-[var(--muted)]">-</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="text-sm font-mono text-[var(--muted)]">{log.ip_address}</span>
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--muted)]">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Pagination */}
      <motion.div variants={itemVariants} className="flex items-center justify-between">
        <p className="text-sm text-[var(--muted)]">
          Affichage de {filteredLogs.length} entrées
        </p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled>
            Précédent
          </Button>
          <Button variant="outline" size="sm" disabled>
            Suivant
          </Button>
        </div>
      </motion.div>
    </motion.div>
  );
}
