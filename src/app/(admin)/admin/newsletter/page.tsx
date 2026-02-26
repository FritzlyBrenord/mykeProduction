'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Mail,
  Users,
  Send,
  BarChart3,
  Eye,
  MousePointer,
  Trash2,
  Edit,
  Clock,
  CheckCircle,
  X,
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
const mockSubscribers = [
  { id: '1', email: 'jean@example.com', is_active: true, created_at: '2026-01-15' },
  { id: '2', email: 'marie@example.com', is_active: true, created_at: '2026-01-20' },
  { id: '3', email: 'pierre@example.com', is_active: false, created_at: '2026-02-01' },
  { id: '4', email: 'sophie@example.com', is_active: true, created_at: '2026-02-10' },
  { id: '5', email: 'lucas@example.com', is_active: true, created_at: '2026-02-15' },
];

const mockCampaigns = [
  {
    id: '1',
    subject: 'Nouvelle formation: Chimie Organique Avancée',
    status: 'sent',
    sent_count: 450,
    open_rate: 45,
    click_rate: 12,
    sent_at: '2026-02-20T10:00:00Z',
  },
  {
    id: '2',
    subject: 'Promotion de février: -20% sur tous les produits',
    status: 'scheduled',
    scheduled_at: '2026-02-28T09:00:00Z',
    sent_count: 0,
    open_rate: 0,
    click_rate: 0,
    sent_at: null,
  },
  {
    id: '3',
    subject: 'Newsletter mensuelle - Janvier 2026',
    status: 'sent',
    sent_count: 523,
    open_rate: 38,
    click_rate: 8,
    sent_at: '2026-01-15T14:00:00Z',
  },
];

export default function NewsletterPage() {
  const [search, setSearch] = useState('');
  const [showNewCampaign, setShowNewCampaign] = useState(false);
  const [activeTab, setActiveTab] = useState<'subscribers' | 'campaigns'>('campaigns');
  
  const activeSubscribers = mockSubscribers.filter((s) => s.is_active).length;
  const inactiveSubscribers = mockSubscribers.filter((s) => !s.is_active).length;

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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Newsletter</h1>
          <p className="text-[var(--muted)] mt-1">Gérez vos campagnes et abonnés</p>
        </div>
        <Button onClick={() => setShowNewCampaign(true)} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle campagne
        </Button>
      </motion.div>

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total abonnés</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{mockSubscribers.length}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Actifs</p>
          <p className="text-2xl font-bold text-green-500">{activeSubscribers}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Campagnes envoyées</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {mockCampaigns.filter((c) => c.status === 'sent').length}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Taux d&apos;ouverture moyen</p>
          <p className="text-2xl font-bold text-purple-500">
            {Math.round(
              mockCampaigns
                .filter((c) => c.status === 'sent')
                .reduce((acc, c) => acc + c.open_rate, 0) /
                mockCampaigns.filter((c) => c.status === 'sent').length
            )}%
          </p>
        </div>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-4 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('campaigns')}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'campaigns'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          )}
        >
          Campagnes
        </button>
        <button
          onClick={() => setActiveTab('subscribers')}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors',
            activeTab === 'subscribers'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          )}
        >
          Abonnés
        </button>
      </motion.div>

      {/* Campaigns Tab */}
      {activeTab === 'campaigns' && (
        <motion.div variants={itemVariants} className="space-y-4">
          {mockCampaigns.map((campaign) => (
            <div
              key={campaign.id}
              className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-[var(--primary)]/10 rounded-xl flex items-center justify-center">
                    <Mail className="w-6 h-6 text-[var(--primary)]" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-[var(--foreground)]">{campaign.subject}</h3>
                    <div className="flex items-center gap-4 mt-2">
                      <span className={cn(
                        'px-2 py-1 rounded-full text-xs font-medium border',
                        campaign.status === 'sent'
                          ? 'bg-green-500/10 text-green-500 border-green-500/20'
                          : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                      )}>
                        {campaign.status === 'sent' ? 'Envoyée' : 'Programmée'}
                      </span>
                      {campaign.status === 'sent' ? (
                        <span className="text-sm text-[var(--muted)]">
                          Envoyée le {formatDate(campaign.sent_at!)}
                        </span>
                      ) : (
                        <span className="text-sm text-[var(--muted)] flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          Programmée le {formatDate(campaign.scheduled_at!)}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors">
                    <Edit className="w-4 h-4 text-[var(--muted)]" />
                  </button>
                  <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </button>
                </div>
              </div>
              
              {campaign.status === 'sent' && (
                <div className="grid grid-cols-3 gap-4 mt-6 pt-6 border-t border-[var(--border)]">
                  <div className="flex items-center gap-3">
                    <Send className="w-5 h-5 text-[var(--muted)]" />
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">{campaign.sent_count}</p>
                      <p className="text-xs text-[var(--muted)]">Envoyés</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-[var(--muted)]" />
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">{campaign.open_rate}%</p>
                      <p className="text-xs text-[var(--muted)]">Taux d&apos;ouverture</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <MousePointer className="w-5 h-5 text-[var(--muted)]" />
                    <div>
                      <p className="text-lg font-semibold text-[var(--foreground)]">{campaign.click_rate}%</p>
                      <p className="text-xs text-[var(--muted)]">Taux de clic</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </motion.div>
      )}

      {/* Subscribers Tab */}
      {activeTab === 'subscribers' && (
        <motion.div variants={itemVariants} className="space-y-4">
          <div className="flex gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
              <input
                type="text"
                placeholder="Rechercher un abonné..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                    <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Email</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                    <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Inscription</th>
                    <th className="text-right py-4 px-6 text-sm font-medium text-[var(--muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockSubscribers.map((subscriber) => (
                    <tr key={subscriber.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <Mail className="w-4 h-4 text-[var(--muted)]" />
                          <span className="text-[var(--foreground)]">{subscriber.email}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          subscriber.is_active
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-red-500/10 text-red-500 border-red-500/20'
                        )}>
                          {subscriber.is_active ? 'Actif' : 'Désinscrit'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-sm text-[var(--muted)]">
                        {formatDate(subscriber.created_at)}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      )}

      {/* New Campaign Modal */}
      {showNewCampaign && (
        <NewCampaignModal onClose={() => setShowNewCampaign(false)} />
      )}
    </motion.div>
  );
}

function NewCampaignModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    subject: '',
    content: '',
    schedule: false,
    scheduled_at: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--card)] rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-auto"
      >
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Nouvelle campagne</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--background)] rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Objet
            </label>
            <input
              type="text"
              value={formData.subject}
              onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
              placeholder="Objet de l'email"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Contenu
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={10}
              placeholder="Contenu de la newsletter..."
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
          </div>
          
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="schedule"
              checked={formData.schedule}
              onChange={(e) => setFormData({ ...formData, schedule: e.target.checked })}
              className="w-5 h-5 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <label htmlFor="schedule" className="text-sm text-[var(--foreground)]">
              Programmer l&apos;envoi
            </label>
          </div>
          
          {formData.schedule && (
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Date et heure d&apos;envoi
              </label>
              <input
                type="datetime-local"
                value={formData.scheduled_at}
                onChange={(e) => setFormData({ ...formData, scheduled_at: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          )}
          
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Annuler
            </Button>
            <Button className="flex-1 gap-2">
              <Send className="w-4 h-4" />
              {formData.schedule ? 'Programmer' : 'Envoyer'}
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
