'use client';

import React from 'react';
import {
  X,
  Package,
  FlaskConical,
  FileText,
  Box,
  AlertTriangle,
  ExternalLink,
  Download,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatPrice, cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProductDetailModalProps {
  product: any;
  onClose: () => void;
}

const typeIcons = {
  chimique: FlaskConical,
  document: FileText,
  autre: Box,
};

export function ProductDetailModal({ product, onClose }: ProductDetailModalProps) {
  if (!product) return null;

  const TypeIcon = typeIcons[product.type as keyof typeof typeIcons];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-[var(--card)] w-full max-w-3xl max-h-[90vh] overflow-hidden rounded-2xl border border-[var(--border)] flex flex-col shadow-2xl"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[var(--border)]">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-[var(--primary)]/10 rounded-lg">
                <TypeIcon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <h2 className="text-xl font-bold text-[var(--foreground)]">{product.name}</h2>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-[var(--muted)]" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Left: Images and basic stats */}
              <div className="space-y-6">
                {/* Main Image */}
                <div className="aspect-square bg-gradient-to-br from-[var(--primary)]/10 to-[var(--primary-dark)]/10 rounded-xl overflow-hidden border border-[var(--border)]">
                  {product.images?.[0] ? (
                    <img
                      src={product.images[0]}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <TypeIcon className="w-24 h-24 text-[var(--primary)]/20" />
                    </div>
                  )}
                </div>

                {/* Image gallery */}
                {product.images && product.images.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto">
                    {product.images.slice(1).map((img: string, idx: number) => (
                      <img
                        key={idx + 1}
                        src={img}
                        alt={`${product.name} - ${idx + 2}`}
                        className="w-16 h-16 rounded-lg object-cover border border-[var(--border)] flex-shrink-0 cursor-pointer hover:border-[var(--primary)] transition-colors"
                      />
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                    <p className="text-xs text-[var(--muted)] uppercase font-semibold mb-1">Prix</p>
                    <p className="text-xl font-bold text-[var(--primary)]">{formatPrice(product.price)}</p>
                  </div>
                  <div className="p-4 bg-[var(--background)] rounded-xl border border-[var(--border)]">
                    <p className="text-xs text-[var(--muted)] uppercase font-semibold mb-1">Stock</p>
                    <p className="text-xl font-bold text-[var(--foreground)]">
                      {product.stock !== null ? product.stock : '∞'} 
                      <span className="text-sm font-normal text-[var(--muted)] ml-1">
                        {product.unit || (product.is_digital ? '' : 'unités')}
                      </span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Right: Details */}
              <div className="space-y-6">
                <div>
                  <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-2">Description</h3>
                  <p className="text-[var(--foreground)] leading-relaxed">
                    {product.description || 'Aucune description fournie.'}
                  </p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--muted)]">Type</span>
                    <span className="font-medium text-[var(--foreground)] capitalize">{product.type}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--muted)]">Slug</span>
                    <span className="font-medium text-[var(--foreground)]">{product.slug}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--muted)]">Catégorie</span>
                    <span className="font-medium text-[var(--foreground)]">{product.category?.name || 'Sans catégorie'}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-[var(--border)]">
                    <span className="text-[var(--muted)]">Statut</span>
                    <span className="font-medium text-[var(--foreground)] capitalize">{product.status}</span>
                  </div>
                  {product.is_digital && (
                    <div className="flex justify-between py-2 border-b border-[var(--border)]">
                      <span className="text-[var(--muted)]">Type produit</span>
                      <span className="font-medium text-green-500 capitalize">Numérique</span>
                    </div>
                  )}
                </div>

                {/* Chemical specific */}
                {product.type === 'chimique' && (
                  <div className="p-4 bg-red-500/5 rounded-xl border border-red-500/10 space-y-3">
                    <h4 className="text-xs font-bold text-red-500 uppercase">🧪 Informations Chimiques</h4>
                    {product.cas_number && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">N° CAS</span>
                        <span className="font-medium text-[var(--foreground)]">{product.cas_number}</span>
                      </div>
                    )}
                    {product.purity && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">Pureté</span>
                        <span className="font-medium text-[var(--foreground)]">{product.purity}</span>
                      </div>
                    )}
                    {product.min_order && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">Qty min</span>
                        <span className="font-medium text-[var(--foreground)]">{product.min_order} {product.unit || 'unités'}</span>
                      </div>
                    )}
                    {product.signal_word && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">Mention</span>
                        <span className={cn(
                          'font-bold',
                          product.signal_word === 'Danger' ? 'text-red-500' : 'text-amber-500'
                        )}>{product.signal_word}</span>
                      </div>
                    )}
                    {product.age_restricted && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">Restrictions</span>
                        <span className="font-medium text-red-500">18+ requis</span>
                      </div>
                    )}
                    {product.restricted_sale && (
                      <div className="flex justify-between text-sm">
                        <span className="text-[var(--muted)]">Vente</span>
                        <span className="font-medium text-amber-500">Restreinte</span>
                      </div>
                    )}
                    {product.ghs_pictograms && product.ghs_pictograms.length > 0 && (
                      <div>
                         <span className="text-xs text-[var(--muted)] block mb-2">Pictogrammes GHS</span>
                         <div className="flex gap-2 flex-wrap">
                            {product.ghs_pictograms.map((pic: string) => (
                              <div key={pic} title={pic} className="w-8 h-8 bg-white border border-gray-200 rounded p-1 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-gray-900">{pic}</span>
                              </div>
                            ))}
                         </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Document specific */}
                {product.type === 'document' && (
                  <div className="p-4 bg-blue-500/5 rounded-xl border border-blue-500/10">
                    <h4 className="text-xs font-bold text-blue-500 uppercase mb-3">📄 Fichier numérique</h4>
                    {product.file_url ? (
                      <a
                        href={product.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex gap-2 items-center justify-center px-4 py-2.5 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors font-medium"
                      >
                        <ExternalLink className="w-4 h-4" />
                        Ouvrir le document
                      </a>
                    ) : (
                      <div className="text-sm text-[var(--muted)] bg-[var(--background)] rounded-lg p-3">
                        <p>❌ Aucun document uploadé</p>
                        <p className="text-xs mt-2">Cliquez sur "Modifier le produit" pour ajouter le document.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Content (Rich Text) */}
            {product.content && (
              <div className="mt-8 pt-8 border-t border-[var(--border)]">
                <h3 className="text-sm font-semibold text-[var(--muted)] uppercase mb-4">Détails techniques</h3>
                <div 
                   className="article-content"
                   dangerouslySetInnerHTML={{ __html: product.content }} 
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-[var(--border)] bg-[var(--background)] flex justify-end gap-3">
            <Button variant="outline" onClick={onClose}>Fermer</Button>
            <Button className="flex gap-2">
              <Edit className="w-4 h-4" />
              Modifier le produit
            </Button>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}

const Edit = ({ className }: { className?: string }) => (
  <svg 
    xmlns="http://www.w3.org/2000/svg" 
    width="24" 
    height="24" 
    viewBox="0 0 24 24" 
    fill="none" 
    stroke="currentColor" 
    strokeWidth="2" 
    strokeLinecap="round" 
    strokeLinejoin="round" 
    className={className}
  >
    <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/>
    <path d="m15 5 4 4"/>
  </svg>
);
