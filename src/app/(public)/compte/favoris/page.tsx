'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingCart, Trash2, BookOpen, ShoppingBag, PlayCircle } from 'lucide-react';
import { WishlistItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';

const mockWishlist: WishlistItem[] = [
  {
    id: '1',
    user_id: '1',
    produit_id: '1',
    item_type: 'produit',
    created_at: '2024-02-10',
    produit: {
      id: '1',
      name: 'Acide sulfurique 98% - 1L',
      slug: 'acide-sulfurique-98-1l',
      description: 'Acide sulfurique concentré de haute pureté',
      price: 45.90,
      images: ['https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800'],
      type: 'chimique',
      stock: 50,
      is_digital: false,
      cas_number: '7664-93-9',
      purity: '98%',
      unit: 'L',
      min_order: 1,
      ghs_pictograms: ['GHS05', 'GHS07'],
      hazard_statements: ['H314', 'H290'],
      precautionary_statements: ['P280', 'P305+P351+P338'],
      signal_word: 'Danger',
      age_restricted: true,
      restricted_sale: false,
      status: 'published',
      featured: true,
      created_at: '2024-01-10',
      updated_at: '2024-01-10',
    }
  },
  {
    id: '2',
    user_id: '1',
    formation_id: '3',
    item_type: 'formation',
    created_at: '2024-02-15',
    formation: {
      id: '3',
      title: 'Gestion de la qualité ISO 9001',
      slug: 'gestion-qualite-iso-9001',
      description: 'Implémentez un système de management de la qualité',
      thumbnail_url: 'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800',
      price: 299,
      is_free: false,
      format: 'video',
      status: 'published',
      category_id: '3',
      duration_hours: 20,
      level: 'avance',
      language: 'fr',
      certificate: true,
      enrolled_count: 189,
      rating_avg: 4.8,
      created_at: '2024-01-20',
      updated_at: '2024-01-20',
    }
  },
];

export default function FavoritesPage() {
  const handleRemove = (id: string) => {
    toast.success('Retiré des favoris');
  };

  const handleAddToCart = (item: WishlistItem) => {
    toast.success('Ajouté au panier');
  };

  const getItemIcon = (type: string) => {
    switch (type) {
      case 'produit':
        return <ShoppingBag className="h-5 w-5" />;
      case 'formation':
        return <BookOpen className="h-5 w-5" />;
      case 'video':
        return <PlayCircle className="h-5 w-5" />;
      default:
        return <ShoppingBag className="h-5 w-5" />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Mes favoris</h1>
          <p className="text-slate-600 mb-8">
            Retrouvez tous vos articles, formations et vidéos sauvegardés
          </p>

          {mockWishlist.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mockWishlist.map((item) => (
                <Card key={item.id} className="overflow-hidden group">
                  <CardContent className="p-0">
                    {/* Image */}
                    <div className="relative aspect-video">
                      <img
                        src={item.produit?.images?.[0] || item.formation?.thumbnail_url || '/images/placeholder.jpg'}
                        alt={item.produit?.name || item.formation?.title || ''}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-3 left-3">
                        <div className="w-8 h-8 bg-white/90 rounded-full flex items-center justify-center">
                          {getItemIcon(item.item_type)}
                        </div>
                      </div>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="absolute top-3 right-3 w-8 h-8 bg-white/90 rounded-full flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    {/* Content */}
                    <div className="p-4">
                      <p className="text-xs text-slate-500 uppercase tracking-wide mb-1">
                        {item.item_type === 'produit' ? 'Produit' : 
                         item.item_type === 'formation' ? 'Formation' : 'Vidéo'}
                      </p>
                      <h3 className="font-semibold text-slate-900 mb-2 line-clamp-2">
                        {item.produit?.name || item.formation?.title}
                      </h3>
                      <p className="text-sm text-slate-600 line-clamp-2 mb-4">
                        {item.produit?.description || item.formation?.description}
                      </p>

                      <div className="flex items-center justify-between">
                        <span className="font-bold text-lg text-slate-900">
                          {formatPrice(item.produit?.price || item.formation?.price || 0)}
                        </span>
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700"
                          onClick={() => handleAddToCart(item)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-2" />
                          Ajouter
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Heart className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h2 className="text-xl font-semibold text-slate-900 mb-2">
                  Aucun favori
                </h2>
                <p className="text-slate-500 mb-6">
                  Sauvegardez vos articles préférés pour les retrouver facilement
                </p>
                <div className="flex gap-4 justify-center">
                  <Link href="/boutique">
                    <Button variant="outline">
                      Voir la boutique
                    </Button>
                  </Link>
                  <Link href="/formations">
                    <Button className="bg-blue-600 hover:bg-blue-700">
                      Voir les formations
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      </div>
    </div>
  );
}
