'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Globe,
  Percent,
  Shield,
  Key,
  Moon,
  Sun,
  Save,
  CheckCircle,
  AlertTriangle,
  Lock,
  Unlock,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

// Mock tax rates
const mockTaxRates = [
  { id: '1', country_code: 'FR', country_name: 'France', rate_percent: 20, is_active: true },
  { id: '2', country_code: 'BE', country_name: 'Belgique', rate_percent: 21, is_active: true },
  { id: '3', country_code: 'CH', country_name: 'Suisse', rate_percent: 7.7, is_active: true },
  { id: '4', country_code: 'CA', country_name: 'Canada', rate_percent: 5, is_active: false },
];

export default function ParametresPage() {
  const { theme, setTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<'general' | 'taxes' | 'security'>('general');
  
  const [generalSettings, setGeneralSettings] = useState({
    site_name: 'Myke Industrie',
    site_description: 'Plateforme de formations et produits chimiques',
    contact_email: 'contact@mykeindustrie.com',
    currency: 'USD',
  });

  const [securitySettings, setSecuritySettings] = useState({
    require_2fa_for_admins: true,
    session_timeout: 8,
    max_login_attempts: 5,
  });

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-3xl font-bold text-[var(--foreground)]">Paramètres</h1>
        <p className="text-[var(--muted)] mt-1">Configurez votre plateforme</p>
      </motion.div>

      {/* Tabs */}
      <motion.div variants={itemVariants} className="flex gap-4 border-b border-[var(--border)]">
        <button
          onClick={() => setActiveTab('general')}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'general'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          )}
        >
          <Settings className="w-4 h-4" />
          Général
        </button>
        <button
          onClick={() => setActiveTab('taxes')}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'taxes'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          )}
        >
          <Percent className="w-4 h-4" />
          TVA
        </button>
        <button
          onClick={() => setActiveTab('security')}
          className={cn(
            'px-4 py-3 text-sm font-medium border-b-2 transition-colors flex items-center gap-2',
            activeTab === 'security'
              ? 'border-[var(--primary)] text-[var(--primary)]'
              : 'border-transparent text-[var(--muted)] hover:text-[var(--foreground)]'
          )}
        >
          <Shield className="w-4 h-4" />
          Sécurité
        </button>
      </motion.div>

      {/* General Settings */}
      {activeTab === 'general' && (
        <motion.div variants={itemVariants} className="space-y-6">
          {/* Site Info */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Informations du site
            </h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Nom du site
                </label>
                <input
                  type="text"
                  value={generalSettings.site_name}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, site_name: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Description
                </label>
                <textarea
                  value={generalSettings.site_description}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, site_description: e.target.value })}
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Email de contact
                </label>
                <input
                  type="email"
                  value={generalSettings.contact_email}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, contact_email: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Devise par défaut
                </label>
                <select
                  value={generalSettings.currency}
                  onChange={(e) => setGeneralSettings({ ...generalSettings, currency: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="USD">USD ($)</option>
                  <option value="EUR">EUR (€)</option>
                  <option value="GBP">GBP (£)</option>
                  <option value="CHF">CHF (Fr)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Appearance */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              Apparence
            </h2>
            
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium text-[var(--foreground)]">Thème</p>
                <p className="text-sm text-[var(--muted)]">Choisissez le thème de l&apos;administration</p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors',
                    theme === 'light'
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)]'
                  )}
                >
                  <Sun className="w-4 h-4" />
                  Clair
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={cn(
                    'flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors',
                    theme === 'dark'
                      ? 'bg-[var(--primary)] text-white border-[var(--primary)]'
                      : 'bg-[var(--background)] border-[var(--border)] text-[var(--foreground)] hover:bg-[var(--card)]'
                  )}
                >
                  <Moon className="w-4 h-4" />
                  Sombre
                </button>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Enregistrer les modifications
            </Button>
          </div>
        </motion.div>
      )}

      {/* Tax Settings */}
      {activeTab === 'taxes' && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2">
                <Percent className="w-5 h-5" />
                Taux de TVA par pays
              </h2>
              <Button size="sm" className="gap-2">
                <span className="text-lg leading-none">+</span>
                Ajouter un taux
              </Button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border)]">
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Pays</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Code</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Taux</th>
                    <th className="text-left py-3 px-4 text-sm font-medium text-[var(--muted)]">Statut</th>
                    <th className="text-right py-3 px-4 text-sm font-medium text-[var(--muted)]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {mockTaxRates.map((rate) => (
                    <tr key={rate.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                      <td className="py-3 px-4 text-[var(--foreground)]">{rate.country_name}</td>
                      <td className="py-3 px-4">
                        <span className="font-mono text-sm text-[var(--muted)]">{rate.country_code}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-medium text-[var(--foreground)]">{rate.rate_percent}%</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={cn(
                          'px-2 py-1 rounded-full text-xs font-medium border',
                          rate.is_active
                            ? 'bg-green-500/10 text-green-500 border-green-500/20'
                            : 'bg-gray-500/10 text-gray-500 border-gray-500/20'
                        )}>
                          {rate.is_active ? 'Actif' : 'Inactif'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <div className="flex items-center justify-end gap-2">
                          <button className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors">
                            <RefreshCw className="w-4 h-4 text-[var(--muted)]" />
                          </button>
                          <button className="p-2 hover:bg-red-500/10 rounded-lg transition-colors">
                            <span className="sr-only">Supprimer</span>
                            <svg className="w-4 h-4 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
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

      {/* Security Settings */}
      {activeTab === 'security' && (
        <motion.div variants={itemVariants} className="space-y-6">
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              Sécurité
            </h2>
            
            <div className="space-y-6">
              {/* 2FA Requirement */}
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-[var(--foreground)]">2FA obligatoire pour les admins</p>
                  <p className="text-sm text-[var(--muted)]">
                    Tous les administrateurs doivent activer l&apos;authentification à deux facteurs
                  </p>
                </div>
                <button
                  onClick={() => setSecuritySettings({
                    ...securitySettings,
                    require_2fa_for_admins: !securitySettings.require_2fa_for_admins
                  })}
                  className={cn(
                    'w-14 h-8 rounded-full transition-colors relative',
                    securitySettings.require_2fa_for_admins ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'
                  )}
                >
                  <span className={cn(
                    'absolute top-1 w-6 h-6 bg-white rounded-full transition-transform',
                    securitySettings.require_2fa_for_admins ? 'left-7' : 'left-1'
                  )} />
                </button>
              </div>

              {/* Session Timeout */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Durée de session (heures)
                </label>
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={securitySettings.session_timeout}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    session_timeout: parseInt(e.target.value)
                  })}
                  className="w-full max-w-xs px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  Les sessions seront automatiquement déconnectées après cette durée
                </p>
              </div>

              {/* Max Login Attempts */}
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  Tentatives de connexion max
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={securitySettings.max_login_attempts}
                  onChange={(e) => setSecuritySettings({
                    ...securitySettings,
                    max_login_attempts: parseInt(e.target.value)
                  })}
                  className="w-full max-w-xs px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <p className="text-xs text-[var(--muted)] mt-1">
                  Le compte sera temporairement bloqué après ce nombre d&apos;échecs
                </p>
              </div>
            </div>
          </div>

          {/* API Keys */}
          <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] p-6">
            <h2 className="text-lg font-semibold text-[var(--foreground)] mb-4 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Clés API
            </h2>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                <div>
                  <p className="font-medium text-[var(--foreground)]">Stripe API Key</p>
                  <p className="text-sm text-[var(--muted)]">pk_live_••••••••••••••••••••</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                    <span className="sr-only">Afficher</span>
                    <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                    <RefreshCw className="w-5 h-5 text-[var(--muted)]" />
                  </button>
                </div>
              </div>
              
              <div className="flex items-center justify-between p-4 bg-[var(--background)] rounded-xl">
                <div>
                  <p className="font-medium text-[var(--foreground)]">PayPal Client ID</p>
                  <p className="text-sm text-[var(--muted)]">AZ••••••••••••••••••••</p>
                </div>
                <div className="flex gap-2">
                  <button className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                    <span className="sr-only">Afficher</span>
                    <svg className="w-5 h-5 text-[var(--muted)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                    </svg>
                  </button>
                  <button className="p-2 hover:bg-[var(--card)] rounded-lg transition-colors">
                    <RefreshCw className="w-5 h-5 text-[var(--muted)]" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <Button className="gap-2">
              <Save className="w-4 h-4" />
              Enregistrer les modifications
            </Button>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
