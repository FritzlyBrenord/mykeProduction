'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  ShoppingCart, Trash2, Plus, Minus, ArrowRight, 
  Package, AlertCircle, Tag, CheckCircle 
} from 'lucide-react';
import { CartItem } from '@/lib/types';
import { formatPrice } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { useAuth } from '@/lib/hooks/useAuth';

const mockCartItems: CartItem[] = [
  {
    id: '1',
    cart_id: '1',
    produit_id: '1',
    item_type: 'produit',
    quantity: 2,
    unit_price: 45.90,
    added_at: '2024-02-20',
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
    cart_id: '1',
    formation_id: '1',
    item_type: 'formation',
    quantity: 1,
    unit_price: 199,
    added_at: '2024-02-20',
    formation: {
      id: '1',
      title: 'Introduction à la chimie industrielle',
      slug: 'introduction-chimie-industrielle',
      description: 'Apprenez les bases de la chimie industrielle',
      thumbnail_url: 'https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800',
      price: 199,
      is_free: false,
      format: 'video',
      status: 'published',
      category_id: '1',
      duration_hours: 12,
      level: 'debutant',
      language: 'fr',
      certificate: true,
      enrolled_count: 245,
      rating_avg: 4.7,
      created_at: '2024-01-15',
      updated_at: '2024-01-15',
    }
  },
];

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>(mockCartItems);
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; discount: number } | null>(null);
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);

  const updateQuantity = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    setCartItems(items => 
      items.map(item => 
        item.id === itemId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const removeItem = (itemId: string) => {
    setCartItems(items => items.filter(item => item.id !== itemId));
    toast.success('Article retiré du panier');
  };

  const applyCoupon = () => {
    if (!couponCode.trim()) return;
    
    setIsApplyingCoupon(true);
    // Simulation
    setTimeout(() => {
      if (couponCode.toUpperCase() === 'PROMO10') {
        setAppliedCoupon({ code: couponCode, discount: 10 });
        toast.success('Code promo appliqué : -10%');
      } else if (couponCode.toUpperCase() === 'WELCOME20') {
        setAppliedCoupon({ code: couponCode, discount: 20 });
        toast.success('Code promo appliqué : -20%');
      } else {
        toast.error('Code promo invalide');
      }
      setIsApplyingCoupon(false);
    }, 500);
  };

  const subtotal = cartItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
  const discountAmount = appliedCoupon ? (subtotal * appliedCoupon.discount / 100) : 0;
  const shippingCost = subtotal > 100 ? 0 : 9.90;
  const total = subtotal - discountAmount + shippingCost;

  const handleCheckout = () => {
    if (!user) {
      toast.error('Vous devez être connecté pour passer commande');
      router.push('/auth/connexion');
      return;
    }
    router.push('/checkout');
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingCart className="h-20 w-20 text-slate-300 mx-auto mb-6" />
          <h1 className="text-2xl font-bold text-slate-900 mb-2">
            Votre panier est vide
          </h1>
          <p className="text-slate-500 mb-6">
            Découvrez nos formations et produits
          </p>
          <div className="flex gap-4 justify-center">
            <Link href="/formations">
              <Button variant="outline">
                Voir les formations
              </Button>
            </Link>
            <Link href="/boutique">
              <Button className="bg-blue-600 hover:bg-blue-700">
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
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className="text-3xl font-bold text-slate-900 mb-8">
            Votre panier ({cartItems.length} article{cartItems.length > 1 ? 's' : ''})
          </h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item, index) => (
                <motion.div
                  key={item.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex gap-4">
                        {/* Image */}
                        <div className="w-24 h-24 flex-shrink-0 bg-slate-100 rounded-lg overflow-hidden">
                          <img
                            src={item.produit?.images?.[0] || item.formation?.thumbnail_url || '/images/placeholder.jpg'}
                            alt={item.produit?.name || item.formation?.title || ''}
                            className="w-full h-full object-cover"
                          />
                        </div>

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm text-slate-500 mb-1">
                                {item.item_type === 'produit' ? 'Produit' : 
                                 item.item_type === 'formation' ? 'Formation' : 'Vidéo'}
                              </p>
                              <h3 className="font-semibold text-slate-900 line-clamp-2">
                                {item.produit?.name || item.formation?.title}
                              </h3>
                              {item.produit?.type === 'chimique' && (
                                <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                                  <AlertCircle className="h-3 w-3" />
                                  Produit chimique - Vente réglementée
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
                            {/* Quantity */}
                            {item.item_type === 'produit' && (
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
                            )}

                            {/* Price */}
                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {formatPrice(item.unit_price * item.quantity)}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatPrice(item.unit_price)} / unité
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

            {/* Summary */}
            <div className="lg:col-span-1">
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="sticky top-24"
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-lg font-semibold text-slate-900 mb-4">
                      Récapitulatif
                    </h2>

                    {/* Coupon */}
                    <div className="mb-6">
                      <label className="text-sm font-medium text-slate-700 mb-2 block">
                        Code promo
                      </label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="Entrez votre code"
                          value={couponCode}
                          onChange={(e) => setCouponCode(e.target.value)}
                          disabled={!!appliedCoupon}
                        />
                        <Button
                          variant="outline"
                          onClick={appliedCoupon ? () => setAppliedCoupon(null) : applyCoupon}
                          disabled={isApplyingCoupon}
                        >
                          {appliedCoupon ? (
                            <X className="h-4 w-4" />
                          ) : (
                            <Tag className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                      {appliedCoupon && (
                        <p className="text-sm text-green-600 mt-2 flex items-center gap-1">
                          <CheckCircle className="h-4 w-4" />
                          Code {appliedCoupon.code} appliqué (-{appliedCoupon.discount}%)
                        </p>
                      )}
                    </div>

                    <Separator className="my-4" />

                    {/* Totals */}
                    <div className="space-y-3">
                      <div className="flex justify-between text-slate-600">
                        <span>Sous-total</span>
                        <span>{formatPrice(subtotal)}</span>
                      </div>
                      {discountAmount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Réduction</span>
                          <span>-{formatPrice(discountAmount)}</span>
                        </div>
                      )}
                      <div className="flex justify-between text-slate-600">
                        <span>Livraison</span>
                        <span>{shippingCost === 0 ? 'Gratuite' : formatPrice(shippingCost)}</span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold text-slate-900">
                        <span>Total</span>
                        <span>{formatPrice(total)}</span>
                      </div>
                    </div>

                    <Button 
                      className="w-full mt-6 bg-blue-600 hover:bg-blue-700 h-12"
                      onClick={handleCheckout}
                    >
                      Passer à la caisse
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>

                    <p className="text-xs text-slate-500 text-center mt-4">
                      Livraison gratuite à partir de 100€ d'achat
                    </p>
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
