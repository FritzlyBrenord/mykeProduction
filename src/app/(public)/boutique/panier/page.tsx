'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { formatPrice } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

function getItemTitle(item: ReturnType<typeof useCart>['items'][number]) {
  if (item.item_type === 'produit') return item.produit?.name || 'Produit';
  if (item.item_type === 'formation') return item.formation?.title || 'Formation';
  return item.video?.title || 'Video';
}

function getItemImage(item: ReturnType<typeof useCart>['items'][number]) {
  if (item.item_type === 'produit') {
    return item.produit?.images?.[0] || '/images/placeholder-product.jpg';
  }
  if (item.item_type === 'formation') {
    return item.formation?.thumbnail_url || '/images/placeholder-formation.jpg';
  }
  return item.video?.thumbnail_url || '/images/placeholder-video.jpg';
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, removeItem, updateQuantity, clearCart } = useCart();

  const subtotal = items.reduce((sum, item) => sum + item.unit_price * item.quantity, 0);
  const hasPhysicalProducts = items.some(
    (item) => item.item_type === 'produit' && !(item.produit?.is_digital ?? false),
  );
  const shippingCost = hasPhysicalProducts ? (subtotal >= 100 ? 0 : 9.9) : 0;
  const total = subtotal + shippingCost;

  const handleCheckout = () => {
    if (!user) {
      toast.error('Connectez-vous pour finaliser la commande.');
      router.push('/auth/connexion');
      return;
    }
    router.push('/checkout');
  };

  const handleClearCart = async () => {
    await clearCart();
    toast.success('Panier vide.');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-slate-500">
          Chargement du panier...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingCart className="h-20 w-20 text-slate-300 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Votre panier est vide</h1>
          <p className="text-slate-500 mb-6">Ajoutez des produits, formations ou videos.</p>
          <div className="flex gap-4 justify-center">
            <Link href="/formations">
              <Button variant="outline">Voir les formations</Button>
            </Link>
            <Link href="/boutique">
              <Button className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950">
                Visiter la boutique
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <h1 className="text-3xl font-bold text-slate-900">
              Votre panier ({items.length} article{items.length > 1 ? 's' : ''})
            </h1>
            <Button variant="outline" onClick={handleClearCart}>
              Vider le panier
            </Button>
          </div>

          {!user && (
            <div className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900 flex items-start gap-2">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <p>
                Panier en mode invite. Connectez-vous et les articles seront synchronises automatiquement vers votre compte.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.06 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        <div className="w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden relative">
                          <Image
                            src={getItemImage(item)}
                            alt={getItemTitle(item)}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-slate-500 mb-1">
                                {item.item_type === 'produit'
                                  ? 'Produit'
                                  : item.item_type === 'formation'
                                    ? 'Formation'
                                    : 'Video'}
                              </p>
                              <h3 className="font-semibold text-slate-900 line-clamp-2">
                                {getItemTitle(item)}
                              </h3>
                              {item.item_type === 'produit' && item.produit?.type === 'chimique' && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Produit chimique - vente reglementee
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-slate-400 hover:text-red-500 transition-colors"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between mt-4">
                            {item.item_type === 'produit' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity - 1)}
                                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateQuantity(item.id, item.quantity + 1)}
                                  className="w-8 h-8 rounded-full border flex items-center justify-center hover:bg-slate-50"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">Quantite fixe: 1</p>
                            )}

                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {formatPrice(item.unit_price * item.quantity, 'USD')}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatPrice(item.unit_price, 'USD')} / unite
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24"
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">Recapitulatif</h2>
                    <div className="space-y-3">
                      <div className="flex justify-between text-slate-600">
                        <span>Sous-total</span>
                        <span>{formatPrice(subtotal, 'USD')}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Livraison</span>
                        <span>
                          {shippingCost === 0 ? 'Gratuite' : formatPrice(shippingCost, 'USD')}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold text-slate-900">
                        <span>Total</span>
                        <span>{formatPrice(total, 'USD')}</span>
                      </div>
                    </div>

                    <Button
                      className="w-full mt-6 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 h-12"
                      onClick={handleCheckout}
                    >
                      Passer a la caisse
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>

                    {hasPhysicalProducts ? (
                      <p className="text-xs text-slate-500 text-center mt-4">
                        Livraison gratuite a partir de {formatPrice(100, 'USD')}.
                      </p>
                    ) : (
                      <p className="text-xs text-slate-500 text-center mt-4">
                        Aucun frais de livraison pour les contenus numeriques.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
