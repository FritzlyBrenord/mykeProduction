'use client';

import { useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  FlaskConical,
  FileText,
  Box,
  AlertTriangle,
  Eye,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, getStatusColor, getStatusLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { useProduits, useDeleteProduit } from '@/hooks/useAdmin';
import { ProductDetailModal } from '@/components/admin/ProductDetailModal';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const typeIcons = {
  chimique: FlaskConical,
  document: FileText,
  autre: Box,
};

const typeColors = {
  chimique: 'bg-red-500/10 text-red-500 border-red-500/20',
  document: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  autre: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
};

export default function ProduitsPage() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  
  const { data: produits = [], isLoading } = useProduits({ 
    type: typeFilter || undefined, 
    status: statusFilter || undefined 
  });
  
  const deleteProduit = useDeleteProduit();

  const filteredProduits = produits.filter((produit: any) => {
    if (search && !produit.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const lowStockCount = produits.filter(
    (p: any) => p.type === 'chimique' && p.stock !== null && p.stock < 50
  ).length;

  const handleDelete = async (id: string) => {
    if (window.confirm('Êtes-vous sûr de vouloir supprimer ce produit ?')) {
      await deleteProduit.mutateAsync(id);
    }
  };

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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Produits</h1>
          <p className="text-[var(--muted)] mt-1">Gérez votre catalogue de produits</p>
        </div>
        <Link href="/admin/produits/nouveau">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nouveau produit
          </Button>
        </Link>
      </motion.div>

      {/* Alerts */}
      {lowStockCount > 0 && (
        <motion.div variants={itemVariants} className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-500" />
          <div>
            <p className="text-sm font-medium text-amber-600">
              {lowStockCount} produit(s) chimique(s) avec stock faible
            </p>
            <p className="text-xs text-amber-500/80">
              Pensez à réapprovisionner votre inventaire
            </p>
          </div>
        </motion.div>
      )}

      {/* Stats */}
      <motion.div variants={itemVariants} className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total produits</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">{produits.length}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Chimiques</p>
          <p className="text-2xl font-bold text-red-500">
            {produits.filter((p: any) => p.type === 'chimique').length}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">En vedette</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {produits.filter((p: any) => p.featured).length}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Stock faible</p>
          <p className="text-2xl font-bold text-amber-500">{lowStockCount}</p>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher un produit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Tous les types</option>
            <option value="chimique">Chimique</option>
            <option value="document">Document</option>
            <option value="autre">Autre</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Tous les statuts</option>
            <option value="published">Publié</option>
            <option value="draft">Brouillon</option>
            <option value="archived">Archivé</option>
          </select>
        </div>
      </motion.div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          <p className="text-[var(--muted)]">Chargement des produits...</p>
        </div>
      ) : filteredProduits.length === 0 ? (
        <div className="text-center py-20 bg-[var(--card)] rounded-2xl border border-dashed border-[var(--border)]">
          <p className="text-[var(--muted)]">Aucun produit trouvé</p>
        </div>
      ) : (
        <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredProduits.map((produit: any) => {
            const TypeIcon = typeIcons[produit.type as keyof typeof typeIcons];
            
            return (
              <div
                key={produit.id}
                className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow group"
              >
                {/* Image */}
                <div className="relative aspect-square bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary-dark)]/10">
                  {produit.images?.[0] ? (
                    <img
                      src={produit.images[0]}
                      alt={produit.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="w-16 h-16 text-[var(--primary)]/30" />
                    </div>
                  )}
                  
                  {/* Badges */}
                  <div className="absolute top-3 left-3 flex flex-wrap gap-2">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium border uppercase', typeColors[produit.type as keyof typeof typeColors])}>
                      {produit.type}
                    </span>
                    {produit.featured && (
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary)] text-white">
                        Vedette
                      </span>
                    )}
                  </div>
                  
                  {/* Actions */}
                  <div className="absolute top-3 right-3 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setSelectedProduct(produit)}
                      className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm"
                    >
                      <Eye className="w-4 h-4 text-gray-900" />
                    </button>
                    <Link href={`/admin/produits/${produit.id}/modifier`}>
                      <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors shadow-sm">
                        <Edit className="w-4 h-4 text-gray-900" />
                      </button>
                    </Link>
                    <button 
                      onClick={() => handleDelete(produit.id)}
                      disabled={deleteProduit.isPending}
                      className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-sm disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 text-white" />
                    </button>
                  </div>
                  
                  {/* Status */}
                  <div className="absolute bottom-3 left-3">
                    <span className={cn('px-2 py-1 rounded-full text-xs font-medium border', getStatusColor(produit.status))}>
                      {getStatusLabel(produit.status)}
                    </span>
                  </div>
                </div>
                
                {/* Content */}
                <div className="p-5">
                  <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-1">{produit.name}</h3>
                  
                  {/* Chemical specific info */}
                  {produit.type === 'chimique' && (
                    <div className="space-y-1 mb-3">
                      {produit.cas_number && (
                        <p className="text-xs text-[var(--muted)]">CAS: {produit.cas_number}</p>
                      )}
                      {produit.signal_word && (
                        <p className={cn(
                          'text-xs font-medium',
                          produit.signal_word === 'Danger' ? 'text-red-500' : 'text-amber-500'
                        )}>
                          {produit.signal_word}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {/* Stock */}
                  <div className="flex items-center gap-2 mb-4">
                    <Package className="w-4 h-4 text-[var(--muted)]" />
                    <span className="text-sm text-[var(--muted)]">
                      {produit.stock !== null ? (
                        <>
                          Stock: <span className={produit.stock < 50 ? 'text-amber-500 font-medium' : 'text-[var(--foreground)]'}>
                            {produit.stock} {produit.unit || 'unités'}
                          </span>
                        </>
                      ) : (
                        <span className="text-green-500">Illimité (numérique)</span>
                      )}
                    </span>
                  </div>
                  
                  {/* Footer */}
                  <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                    <span className="text-xl font-bold text-[var(--foreground)]">
                      {formatPrice(produit.price)}
                    </span>
                    {produit.is_digital && (
                      <span className="text-xs text-[var(--muted)] bg-[var(--background)] px-2 py-1 rounded">
                        Numérique
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </motion.div>
      )}

      {/* Detail Modal */}
      <ProductDetailModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </motion.div>
  );
}
