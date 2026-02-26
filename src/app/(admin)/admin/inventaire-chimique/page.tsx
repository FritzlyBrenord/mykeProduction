'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Search,
  Plus,
  AlertTriangle,
  Calendar,
  Package,
  ArrowDownLeft,
  ArrowUpRight,
  RotateCcw,
  Trash2,
  Download,
  Filter,
  Beaker,
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
const mockInventaire = [
  {
    id: '1',
    produit: { name: 'Acide sulfurique 95%', cas_number: '7664-93-9' },
    batch_number: 'LOT-2026-001',
    quantity_in: 200,
    quantity_out: 50,
    quantity_current: 150,
    purity_percent: 95.5,
    manufacturing_date: '2026-01-15',
    expiry_date: '2027-01-15',
    storage_location: 'Entrepôt A, Étagère 3, Case B',
    safety_class: 'Corrosif',
    movement_type: 'entree',
    created_at: '2026-01-20T10:00:00Z',
  },
  {
    id: '2',
    produit: { name: 'Éthanol absolu', cas_number: '64-17-5' },
    batch_number: 'LOT-2026-002',
    quantity_in: 100,
    quantity_out: 55,
    quantity_current: 45,
    purity_percent: 99.9,
    manufacturing_date: '2026-02-01',
    expiry_date: '2027-02-01',
    storage_location: 'Entrepôt B, Étagère 1, Case A',
    safety_class: 'Inflammable',
    movement_type: 'vente',
    created_at: '2026-02-15T14:30:00Z',
  },
  {
    id: '3',
    produit: { name: 'Acétone', cas_number: '67-64-1' },
    batch_number: 'LOT-2026-003',
    quantity_in: 500,
    quantity_out: 0,
    quantity_current: 500,
    purity_percent: 99.5,
    manufacturing_date: '2026-02-10',
    expiry_date: '2026-08-10',
    storage_location: 'Entrepôt B, Étagère 2, Case C',
    safety_class: 'Inflammable',
    movement_type: 'entree',
    created_at: '2026-02-20T09:00:00Z',
  },
  {
    id: '4',
    produit: { name: 'Méthanol', cas_number: '67-56-1' },
    batch_number: 'LOT-2025-089',
    quantity_in: 100,
    quantity_out: 100,
    quantity_current: 0,
    purity_percent: 99.8,
    manufacturing_date: '2025-06-01',
    expiry_date: '2026-06-01',
    storage_location: 'Entrepôt B, Étagère 1, Case D',
    safety_class: 'Toxique',
    movement_type: 'peremption',
    created_at: '2026-02-22T11:00:00Z',
  },
];

const movementTypeLabels: Record<string, { label: string; color: string; icon: any }> = {
  entree: { label: 'Entrée', color: 'text-green-500', icon: ArrowDownLeft },
  vente: { label: 'Vente', color: 'text-blue-500', icon: ArrowUpRight },
  perte: { label: 'Perte', color: 'text-red-500', icon: Trash2 },
  retour: { label: 'Retour', color: 'text-purple-500', icon: RotateCcw },
  peremption: { label: 'Péremption', color: 'text-amber-500', icon: Calendar },
};

export default function InventaireChimiquePage() {
  const [search, setSearch] = useState('');
  const [showNewMovement, setShowNewMovement] = useState(false);
  
  // Check for products near expiry (within 3 months)
  const today = new Date();
  const threeMonthsFromNow = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000);
  
  const nearExpiry = mockInventaire.filter((item) => {
    const expiryDate = new Date(item.expiry_date);
    return expiryDate <= threeMonthsFromNow && item.quantity_current > 0;
  });

  const lowStock = mockInventaire.filter((item) => item.quantity_current < 50 && item.quantity_current > 0);

  const filteredInventaire = mockInventaire.filter((item) =>
    item.produit.name.toLowerCase().includes(search.toLowerCase()) ||
    item.batch_number.toLowerCase().includes(search.toLowerCase()) ||
    item.cas_number?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Inventaire Chimique</h1>
          <p className="text-[var(--muted)] mt-1">Gestion des stocks et traçabilité légale</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
          <Button onClick={() => setShowNewMovement(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau mouvement
          </Button>
        </div>
      </motion.div>

      {/* Alerts */}
      {nearExpiry.length > 0 && (
        <motion.div variants={itemVariants} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-amber-600">
                {nearExpiry.length} produit(s) proche(s) de la péremption
              </p>
              <p className="text-sm text-amber-500/80 mt-1">
                Vérifiez les dates d&apos;expiration et planifiez l&apos;utilisation ou la mise au rebut.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {lowStock.length > 0 && (
        <motion.div variants={itemVariants} className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-600">
                {lowStock.length} produit(s) avec stock critique
              </p>
              <p className="text-sm text-red-500/80 mt-1">
                Le stock est inférieur à 50 unités. Pensez à réapprovisionner.
              </p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Lots en stock</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {mockInventaire.filter((i) => i.quantity_current > 0).length}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Valeur totale</p>
          <p className="text-2xl font-bold text-[var(--primary)]">$45,230</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Stock faible</p>
          <p className="text-2xl font-bold text-red-500">{lowStock.length}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Péremption proche</p>
          <p className="text-2xl font-bold text-amber-500">{nearExpiry.length}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher par nom, lot ou CAS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
      </motion.div>

      {/* Inventory Table */}
      <motion.div variants={itemVariants} className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background)]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[var(--muted)]">Produit</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Lot</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Stock</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Pureté</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Péremption</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Emplacement</th>
                <th className="text-left py-4 px-4 text-sm font-medium text-[var(--muted)]">Mouvement</th>
              </tr>
            </thead>
            <tbody>
              {filteredInventaire.map((item) => {
                const movement = movementTypeLabels[item.movement_type];
                const MovementIcon = movement.icon;
                const isNearExpiry = new Date(item.expiry_date) <= threeMonthsFromNow && item.quantity_current > 0;
                const isLowStock = item.quantity_current < 50 && item.quantity_current > 0;
                
                return (
                  <tr key={item.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--background)]/50 transition-colors">
                    <td className="py-4 px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                          <Beaker className="w-5 h-5 text-red-500" />
                        </div>
                        <div>
                          <p className="font-medium text-[var(--foreground)]">{item.produit.name}</p>
                          <p className="text-xs text-[var(--muted)]">CAS: {item.produit.cas_number}</p>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm font-mono text-[var(--foreground)]">
                      {item.batch_number}
                    </td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-2">
                        <span className={cn(
                          'font-medium',
                          isLowStock ? 'text-red-500' : 'text-[var(--foreground)]'
                        )}>
                          {item.quantity_current}
                        </span>
                        <span className="text-xs text-[var(--muted)]">
                          / {item.quantity_in} init.
                        </span>
                      </div>
                      {isLowStock && (
                        <span className="text-xs text-red-500">Stock critique</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--foreground)]">
                      {item.purity_percent}%
                    </td>
                    <td className="py-4 px-4">
                      <span className={cn(
                        'text-sm',
                        isNearExpiry ? 'text-amber-500 font-medium' : 'text-[var(--foreground)]'
                      )}>
                        {formatDate(item.expiry_date)}
                      </span>
                      {isNearExpiry && (
                        <span className="text-xs text-amber-500 block">Péremption proche</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-sm text-[var(--muted)]">
                      {item.storage_location}
                    </td>
                    <td className="py-4 px-4">
                      <div className={cn('flex items-center gap-2', movement.color)}>
                        <MovementIcon className="w-4 h-4" />
                        <span className="text-sm font-medium">{movement.label}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* New Movement Modal */}
      {showNewMovement && (
        <NewMovementModal onClose={() => setShowNewMovement(false)} />
      )}
    </motion.div>
  );
}

function NewMovementModal({ onClose }: { onClose: () => void }) {
  const [formData, setFormData] = useState({
    produit_id: '',
    batch_number: '',
    quantity: 0,
    purity_percent: 100,
    manufacturing_date: '',
    expiry_date: '',
    storage_location: '',
    safety_class: '',
    movement_type: 'entree',
    notes: '',
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-[var(--card)] rounded-2xl max-w-lg w-full max-h-[90vh] overflow-auto"
      >
        <div className="p-6 border-b border-[var(--border)] flex items-center justify-between">
          <h2 className="text-xl font-bold text-[var(--foreground)]">Nouveau mouvement</h2>
          <button onClick={onClose} className="p-2 hover:bg-[var(--background)] rounded-lg">
            <span className="sr-only">Fermer</span>
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Type de mouvement
            </label>
            <select
              value={formData.movement_type}
              onChange={(e) => setFormData({ ...formData, movement_type: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="entree">Entrée en stock</option>
              <option value="vente">Vente</option>
              <option value="perte">Perte</option>
              <option value="retour">Retour</option>
              <option value="peremption">Péremption</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Produit
            </label>
            <select
              value={formData.produit_id}
              onChange={(e) => setFormData({ ...formData, produit_id: e.target.value })}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Sélectionner un produit</option>
              <option value="1">Acide sulfurique 95%</option>
              <option value="2">Éthanol absolu</option>
              <option value="3">Acétone</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Numéro de lot
            </label>
            <input
              type="text"
              value={formData.batch_number}
              onChange={(e) => setFormData({ ...formData, batch_number: e.target.value })}
              placeholder="LOT-2026-XXX"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Quantité
              </label>
              <input
                type="number"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Pureté (%)
              </label>
              <input
                type="number"
                step="0.1"
                value={formData.purity_percent}
                onChange={(e) => setFormData({ ...formData, purity_percent: parseFloat(e.target.value) })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Date de fabrication
              </label>
              <input
                type="date"
                value={formData.manufacturing_date}
                onChange={(e) => setFormData({ ...formData, manufacturing_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Date de péremption
              </label>
              <input
                type="date"
                value={formData.expiry_date}
                onChange={(e) => setFormData({ ...formData, expiry_date: e.target.value })}
                className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Emplacement de stockage
            </label>
            <input
              type="text"
              value={formData.storage_location}
              onChange={(e) => setFormData({ ...formData, storage_location: e.target.value })}
              placeholder="Entrepôt A, Étagère 3, Case B"
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-none"
            />
          </div>
          
          <div className="flex gap-3 pt-4">
            <Button onClick={onClose} variant="outline" className="flex-1">
              Annuler
            </Button>
            <Button className="flex-1">
              Enregistrer
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
