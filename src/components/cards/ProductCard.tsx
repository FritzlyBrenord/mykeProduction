'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingCart, Heart, Beaker, FileText, Package, AlertTriangle, ArrowRight } from 'lucide-react';
import { Produit } from '@/lib/types';
import { formatPrice } from '@/lib/utils/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/lib/hooks/useCart';
import { toast } from 'sonner';

interface ProductCardProps {
  produit: Produit;
  index?: number;
}

export default function ProductCard({ produit, index = 0 }: ProductCardProps) {
  const { addItem } = useCart();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await addItem({
        item_type: 'produit',
        item_id: produit.id,
        unit_price: produit.price,
        quantity: 1,
      });
      toast.success('Produit ajouté au panier');
    } catch (error) {
      toast.error('Erreur lors de l\'ajout au panier');
    }
  };

  const getTypeIcon = () => {
    switch (produit.type) {
      case 'chimique':
        return <Beaker className="h-4 w-4 text-amber-500" />;
      case 'document':
        return <FileText className="h-4 w-4 text-amber-500" />;
      default:
        return <Package className="h-4 w-4 text-amber-500" />;
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
      <Card className="group overflow-hidden hover:shadow-2xl transition-all duration-500 border-slate-200/60 bg-white">
        {/* Image */}
        <div className="relative aspect-square overflow-hidden bg-slate-50">
          <Image
            src={produit.images?.[0] || '/images/placeholder-product.jpg'}
            alt={produit.name}
            fill
            className="object-cover group-hover:scale-105 transition-transform duration-700"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
          
          {/* Badges */}
          <div className="absolute top-4 left-4 flex flex-col gap-2">
            <Badge className="bg-amber-500/90 hover:bg-amber-500 text-slate-950 font-semibold px-3 py-1">
              {formatPrice(produit.price)}
            </Badge>
            <Badge variant="secondary" className="bg-white/95 backdrop-blur-sm text-slate-700 font-medium flex items-center gap-1.5">
              {getTypeIcon()}
              {getTypeLabel()}
            </Badge>
          </div>

          {/* Chemical Warning */}
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

          {/* Featured */}
          {produit.featured && (
            <div className="absolute bottom-4 left-4">
              <Badge className="bg-slate-900/90 text-white font-medium">
                En vedette
              </Badge>
            </div>
          )}

          {/* Quick Actions */}
          <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-2 group-hover:translate-y-0">
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

        {/* Content */}
        <CardContent className="p-6">
          <Link href={`/boutique/${produit.slug}`}>
            <h3 className="font-[family-name:var(--font-playfair)] font-semibold text-lg text-slate-900 mb-2 line-clamp-2 group-hover:text-amber-600 transition-colors">
              {produit.name}
            </h3>
          </Link>

          <p className="text-slate-500 text-sm line-clamp-2 mb-4 leading-relaxed">
            {produit.description}
          </p>

          {/* Stock Info */}
          <div className="flex items-center justify-between mb-4">
            {produit.stock !== null ? (
              <span className={`text-sm font-medium ${
                produit.stock > 5 ? 'text-emerald-600' : 
                produit.stock > 0 ? 'text-amber-600' : 'text-red-600'
              }`}>
                {produit.stock > 0 ? `${produit.stock} en stock` : 'Rupture de stock'}
              </span>
            ) : (
              <span className="text-sm text-slate-500">Stock illimité</span>
            )}
            {produit.unit && (
              <span className="text-sm text-slate-400">
                /{produit.unit}
              </span>
            )}
          </div>

          {/* GHS Pictograms */}
          {produit.ghs_pictograms && produit.ghs_pictograms.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-4">
              {produit.ghs_pictograms.slice(0, 3).map((picto) => (
                <Badge key={picto} variant="outline" className="text-xs border-slate-200 text-slate-600">
                  {picto}
                </Badge>
              ))}
              {produit.ghs_pictograms.length > 3 && (
                <Badge variant="outline" className="text-xs border-slate-200 text-slate-600">
                  +{produit.ghs_pictograms.length - 3}
                </Badge>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <Button 
              className="flex-1 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 transition-all duration-300 group/btn"
              onClick={handleAddToCart}
              disabled={produit.stock === 0}
            >
              <ShoppingCart className="h-4 w-4 mr-2" />
              Ajouter
              <ArrowRight className="h-4 w-4 ml-1 opacity-0 -translate-x-2 group-hover/btn:opacity-100 group-hover/btn:translate-x-0 transition-all" />
            </Button>
            <Button variant="outline" size="icon" className="border-slate-200 hover:border-amber-400 hover:text-amber-600">
              <Heart className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
