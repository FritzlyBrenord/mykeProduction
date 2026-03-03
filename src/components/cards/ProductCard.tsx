'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/lib/hooks/useCart';
import { getPrimaryProductImage } from '@/lib/products';
import { Produit } from '@/lib/types';
import { formatPrice } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import {
  AlertTriangle,
  ArrowRight,
  Beaker,
  FileText,
  Heart,
  Package,
  ShoppingCart,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { toast } from 'sonner';

interface ProductCardProps {
  produit: Produit;
  index?: number;
}

function typeStyle(type: Produit['type']) {
  if (type === 'chimique') {
    return {
      priceBadge: 'bg-amber-500/90 hover:bg-amber-500 text-slate-950',
      ring: 'group-hover:ring-amber-300',
      noteClass: 'text-amber-700',
    };
  }
  if (type === 'document') {
    return {
      priceBadge: 'bg-cyan-500/90 hover:bg-cyan-500 text-white',
      ring: 'group-hover:ring-cyan-300',
      noteClass: 'text-cyan-700',
    };
  }
  return {
    priceBadge: 'bg-slate-900/90 hover:bg-slate-900 text-white',
    ring: 'group-hover:ring-slate-300',
    noteClass: 'text-slate-600',
  };
}

export default function ProductCard({ produit, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();
  const imageSrc = getPrimaryProductImage(produit.images) || '/images/placeholder-product.svg';
  const minOrderQuantity = Math.max(1, Number(produit.min_order || 1));
  const isOutOfStock = produit.stock !== null && produit.stock <= 0;
  const style = typeStyle(produit.type);

  const handleAddToCart = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();

    if (isOutOfStock) {
      toast.error('Produit en rupture de stock');
      return;
    }

    if (produit.stock !== null && minOrderQuantity > produit.stock) {
      toast.error('Stock insuffisant pour la quantite minimale');
      return;
    }

    try {
      await addItem({
        item_type: 'produit',
        item_id: produit.id,
        unit_price: produit.price,
        quantity: minOrderQuantity,
        item_name: produit.name,
        item_image: imageSrc,
        produit_type: produit.type,
        is_digital: produit.is_digital,
      });
      toast.success(
        minOrderQuantity > 1
          ? `${minOrderQuantity} unites ajoutees au panier`
          : 'Produit ajoute au panier',
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur lors de l'ajout au panier";
      toast.error(message);
    }
  };

  const getTypeIcon = () => {
    switch (produit.type) {
      case 'chimique':
        return <Beaker className="h-4 w-4 text-amber-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-cyan-600" />;
      default:
        return <Package className="h-4 w-4 text-slate-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (produit.type) {
      case 'chimique':
        return 'Chimique';
      case 'document':
        return 'Document';
      default:
        return 'Produit';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Card
        className={`group relative overflow-hidden hover:shadow-2xl transition-all duration-500 border-slate-200/60 bg-white ring-1 ring-transparent ${style.ring}`}
      >
        <Link
          href={`/boutique/${produit.slug}`}
          className="absolute inset-0 z-10"
          aria-label={`Voir le detail de ${produit.name}`}
        />

        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <Image
            src={imageSrc}
            alt={produit.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className={`${style.priceBadge} font-semibold px-3 py-1`}>
              {formatPrice(produit.price, 'USD')}
            </Badge>
            <Badge
              variant="secondary"
              className="bg-white/95 backdrop-blur-sm text-slate-700 font-medium flex items-center gap-1.5"
            >
              {getTypeIcon()}
              {getTypeLabel()}
            </Badge>
          </div>

          {produit.type === 'chimique' && produit.signal_word && (
            <div className="absolute top-4 right-4">
              <Badge
                variant="destructive"
                className="bg-red-500/90 text-white font-medium flex items-center gap-1"
              >
                <AlertTriangle className="h-3 w-3" />
                {produit.signal_word}
              </Badge>
            </div>
          )}

          {produit.featured && (
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-slate-900/90 text-white font-medium">En vedette</Badge>
            </div>
          )}

          <div className="absolute bottom-4 right-4 z-20 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
            <Button
              variant="secondary"
              size="icon"
              className="bg-white hover:bg-amber-50 shadow-lg border border-slate-200"
              onClick={handleAddToCart}
            >
              <ShoppingCart className="h-4 w-4 text-slate-700" />
            </Button>
          </div>
        </div>

        <CardContent className="relative z-20 p-6">
          <h3 className="font-[family-name:var(--font-playfair)] font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
            {produit.name}
          </h3>

          <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
            {produit.description}
          </p>

          <div className="flex items-center justify-between mb-3">
            {produit.stock !== null ? (
              <span
                className={`text-sm font-medium ${
                  produit.stock > 5
                    ? 'text-emerald-600'
                    : produit.stock > 0
                      ? 'text-amber-600'
                      : 'text-red-600'
                }`}
              >
                {produit.stock > 0 ? `${produit.stock} en stock` : 'Rupture de stock'}
              </span>
            ) : (
              <span className="text-sm text-slate-500">Stock illimite</span>
            )}
            {produit.unit && <span className="text-sm text-slate-400">/{produit.unit}</span>}
          </div>

          {minOrderQuantity > 1 && (
            <p className={`text-xs mb-3 ${style.noteClass}`}>Quantite minimale: {minOrderQuantity}</p>
          )}
          {produit.type === 'document' && (
            <p className="text-xs text-cyan-700 mb-3">
              Document numerique: acces rapide apres paiement.
            </p>
          )}

          <div className="flex gap-2">
            <Button
              className="flex-1 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 group/btn"
              onClick={handleAddToCart}
              disabled={isOutOfStock}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              {minOrderQuantity > 1 ? `Ajouter x${minOrderQuantity}` : 'Ajouter'}
              <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
            </Button>
            <Button
              variant="outline"
              size="icon"
              className="border-slate-200 hover:border-amber-400 hover:text-amber-600"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
              }}
            >
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
