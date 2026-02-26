'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  User,
  Shield,
  ShieldCheck,
  Ban,
  CheckCircle,
  LogOut,
  Eye,
  MoreHorizontal,
  Users,
  UserCheck,
  UserX,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatDate } from '@/lib/utils';
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
const mockUsers = [
  {
    id: '1',
    full_name: 'Jean Dupont',
    email: 'jean.dupont@example.com',
    role: 'admin',
    is_active: true,
    two_fa_enabled: true,
    last_login_at: '2026-02-24T10:30:00Z',
    created_at: '2025-12-01T00:00:00Z',
    avatar_url: null,
  },
  {
    id: '2',
    full_name: 'Marie Martin',
    email: 'marie.martin@example.com',
    role: 'client',
    is_active: true,
    two_fa_enabled: false,
    last_login_at: '2026-02-24T08:15:00Z',
    created_at: '2026-01-15T00:00:00Z',
    avatar_url: null,
  },
  {
    id: '3',
    full_name: 'Pierre Bernard',
    email: 'pierre.bernard@example.com',
    role: 'client',
    is_active: false,
    two_fa_enabled: false,
    last_login_at: '2026-02-20T14:20:00Z',
    created_at: '2026-01-20T00:00:00Z',
    avatar_url: null,
  },
  {
    id: '4',
    full_name: 'Sophie Petit',
    email: 'sophie.petit@example.com',
    role: 'client',
    is_active: true,
    two_fa_enabled: true,
    last_login_at: '2026-02-23T16:45:00Z',
    created_at: '2026-02-01T00:00:00Z',
    avatar_url: null,
  },
  {
    id: '5',
    full_name: 'Lucas Moreau',
    email: 'lucas.moreau@example.com',
    role: 'client',
    is_active: true,
    two_fa_enabled: false,
    last_login_at: '2026-02-22T11:20:00Z',
    created_at: '2026-02-05T00:00:00Z',
    avatar_url: null,
  },
];

export default function UtilisateursPage() {
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [selectedUser, setSelectedUser] = useState<typeof mockUsers[0] | null>(null);
  
  const filteredUsers = mockUsers.filter((user) => {
    if (roleFilter && user.role !== roleFilter) return false;
    if (search && !user.full_name?.toLowerCase().includes(search.toLowerCase()) && 
        !user.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const stats = {
    total: mockUsers.length,
    admins: mockUsers.filter((u) => u.role === 'admin').length,
    clients: mockUsers.filter((u) => u.role === 'client').length,
    active: mockUsers.filter((u) => u.is_active).length,
    inactive: mockUsers.filter((u) => !u.is_active).length,
    with2FA: mockUsers.filter((u) => u.two_fa_enabled).length,
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
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Utilisateurs</h1>
        <p className="text-[var(--muted)] mt-1">Gérez les utilisateurs et leurs permissions</p>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{stats.total}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Admins</p>
          <p className="text-2xl font-bold text-purple-500">{stats.admins}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Clients</p>
          <p className="text-2xl font-bold text-blue-500">{stats.clients}</p>
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
          <p className="text-sm text-[var(--muted)]">2FA activé</p>
          <p className="text-2xl font-bold text-[var(--primary)]">{stats.with2FA}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher un utilisateur..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les rôles</option>
          <option value="admin">Administrateur</option>
          <option value="client">Client</option>
        </select>
      </motion.div>

      {/* Users Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Utilisateur</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Rôle</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">2FA</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Dernière connexion</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Inscription</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.map((user) => (
                <tr key={user.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                        {user.avatar_url ? (
                          <img src={user.avatar_url} alt={user.full_name} className="w-10 h-10 rounded-full" />
                        ) : (
                          <User className="w-5 h-5 text-[var(--primary)]" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-[var(--foreground)]">{user.full_name || 'Sans nom'}</p>
                        <p className="text-sm text-[var(--muted)]">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn(
                      'px-2 py-1 rounded-full text-xs font-medium border',
                      user.role === 'admin'
                        ? 'bg-purple-500/10 text-purple-500 border-purple-500/20'
                        : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                    )}>
                      {user.role === 'admin' ? 'Administrateur' : 'Client'}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={cn(
                      'flex items-center gap-1.5 text-sm',
                      user.is_active ? 'text-green-500' : 'text-red-500'
                    )}>
                      {user.is_active ? (
                        <>
                          <UserCheck className="w-4 h-4" />
                          Actif
                        </>
                      ) : (
                        <>
                          <UserX className="w-4 h-4" />
                          Inactif
                        </>
                      )}
                    </span>
                  </td>
                  <td className="py-4 px-4">
                    {user.two_fa_enabled ? (
                      <span className="flex items-center gap-1.5 text-sm text-green-500">
                        <ShieldCheck className="w-4 h-4" />
                        Activé
                      </span>
                    ) : (
                      <span className="flex items-center gap-1.5 text-sm text-[var(--muted)]">
                        <Shield className="w-4 h-4" />
                        Désactivé
                      </span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-sm text-[var(--muted)]">
                    {user.last_login_at ? formatDate(user.last_login_at) : 'Jamais'}
                  </td>
                  <td className="py-4 px-4 text-sm text-[var(--muted)]">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                        title="Voir détails"
                      >
                        <Eye className="w-4 h-4 text-[var(--muted)]" />
                      </button>
                      <button
                        className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                        title={user.is_active ? 'Désactiver' : 'Activer'}
                      >
                        {user.is_active ? (
                          <Ban className="w-4 h-4 text-red-500" />
                        ) : (
                          <CheckCircle className="w-4 h-4 text-green-500" />
                        )}
                      </button>
                      <button
                        className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
                        title="Révoquer les sessions"
                      >
                        <LogOut className="w-4 h-4 text-[var(--muted)]" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* User Detail Modal */}
      {selectedUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-[var(--card)] rounded-2xl max-w-lg w-full"
          >
            <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
              <h2 className="text-xl font-bold text-[var(--foreground)]">Détails utilisateur</h2>
              <button onClick={() => setSelectedUser(null)} className="p-2 hover:bg-[var(--background)] rounded-lg">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 bg-[var(--primary)]/10 rounded-full flex items-center justify-center">
                  <User className="w-8 h-8 text-[var(--primary)]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">
                    {selectedUser.full_name || 'Sans nom'}
                  </h3>
                  <p className="text-sm text-[var(--muted)]">{selectedUser.email}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)]">Rôle</p>
                  <p className="font-medium text-[var(--foreground)]">
                    {selectedUser.role === 'admin' ? 'Administrateur' : 'Client'}
                  </p>
                </div>
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)]">Statut</p>
                  <p className={cn('font-medium', selectedUser.is_active ? 'text-green-500' : 'text-red-500')}>
                    {selectedUser.is_active ? 'Actif' : 'Inactif'}
                  </p>
                </div>
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)]">2FA</p>
                  <p className={cn('font-medium', selectedUser.two_fa_enabled ? 'text-green-500' : 'text-[var(--muted)]')}>
                    {selectedUser.two_fa_enabled ? 'Activé' : 'Désactivé'}
                  </p>
                </div>
                <div className="bg-[var(--background)] rounded-xl p-4">
                  <p className="text-sm text-[var(--muted)]">Inscription</p>
                  <p className="font-medium text-[var(--foreground)]">{formatDate(selectedUser.created_at)}</p>
                </div>
              </div>
              
              <div className="flex gap-3">
                <Button variant="outline" className="flex-1 gap-2">
                  <Users className="w-4 h-4" />
                  Voir sessions
                </Button>
                <Button variant="outline" className="flex-1 gap-2 text-red-500 hover:bg-red-500/10">
                  <Ban className="w-4 h-4" />
                  {selectedUser.is_active ? 'Désactiver' : 'Activer'}
                </Button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}
