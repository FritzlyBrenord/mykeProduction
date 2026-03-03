'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/lib/hooks/useAuth';
import { useCart } from '@/lib/hooks/useCart';
import { formatPrice } from '@/lib/utils/format';
import { motion } from 'framer-motion';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  CreditCard,
  Lock,
  Package,
  Shield,
  Truck,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { FormEvent, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

const PROCESSING_STEPS_BY_METHOD: Record<PaymentMethod, string[]> = {
  card: [
    'Verification de la carte...',
    'Autorisation bancaire (simulation)...',
    'Validation de la commande...',
  ],
  paypal: [
    'Verification du compte PayPal...',
    'Confirmation du paiement (simulation)...',
    'Validation de la commande...',
  ],
};

type PaymentMethod = 'card' | 'paypal';

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isLuhnValid(value: string) {
  const digits = value.replace(/\D/g, '');
  let sum = 0;
  let shouldDouble = false;

  for (let index = digits.length - 1; index >= 0; index -= 1) {
    let digit = Number.parseInt(digits[index], 10);
    if (Number.isNaN(digit)) return false;

    if (shouldDouble) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    shouldDouble = !shouldDouble;
  }

  return digits.length >= 13 && digits.length <= 19 && sum % 10 === 0;
}

function isExpiryValid(value: string) {
  const match = value.match(/^(\d{2})\/(\d{2})$/);
  if (!match) return false;

  const month = Number.parseInt(match[1], 10);
  const year = Number.parseInt(match[2], 10) + 2000;
  if (month < 1 || month > 12) return false;

  const now = new Date();
  const expiryDate = new Date(year, month, 0, 23, 59, 59, 999);
  return expiryDate.getTime() >= now.getTime();
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, refreshCart } = useCart();

  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStepIndex, setProcessingStepIndex] = useState(0);
  const [processingSteps, setProcessingSteps] = useState<string[]>(PROCESSING_STEPS_BY_METHOD.card);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('card');

  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'US',
    phone: '',
  });

  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  useEffect(() => {
    if (!user) return;
    const fullName = (user.full_name || '').trim();
    const [firstName, ...rest] = fullName.split(' ');
    const lastName = rest.join(' ');
    setShippingInfo((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName || '',
      lastName: prev.lastName || lastName || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  const orderSummary = useMemo(() => {
    const mappedItems = items.map((item) => {
      const name =
        item.item_type === 'produit'
          ? item.produit?.name || 'Produit'
          : item.item_type === 'formation'
            ? item.formation?.title || 'Formation'
            : item.video?.title || 'Video';
      return {
        name,
        quantity: item.quantity,
        total: item.quantity * item.unit_price,
      };
    });

    const subtotal = mappedItems.reduce((sum, item) => sum + item.total, 0);
    const hasPhysicalProducts = items.some(
      (item) => item.item_type === 'produit' && !(item.produit?.is_digital ?? false),
    );
    const shipping = hasPhysicalProducts ? (subtotal >= 100 ? 0 : 9.9) : 0;
    const total = subtotal + shipping;

    return { items: mappedItems, subtotal, shipping, total, hasPhysicalProducts };
  }, [items]);

  const canCheckout = Boolean(user) && !loading && items.length > 0;

  const handleShippingSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canCheckout) {
      toast.error('Impossible de continuer le checkout.');
      return;
    }
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const handlePayment = async (e?: FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!canCheckout) {
      toast.error('Session invalide. Reessayez.');
      router.push('/auth/connexion');
      return;
    }

    if (paymentMethod === 'card') {
      const cardNumber = cardInfo.number.replace(/\s/g, '');
      const cvcIsValid = /^\d{3,4}$/.test(cardInfo.cvc);
      if (!cardInfo.name.trim() || !isLuhnValid(cardNumber) || !isExpiryValid(cardInfo.expiry) || !cvcIsValid) {
        toast.error('Informations de carte invalides.');
        return;
      }
    }

    const activeSteps = PROCESSING_STEPS_BY_METHOD[paymentMethod];
    setProcessingSteps(activeSteps);
    setIsProcessing(true);
    setProcessingStepIndex(0);

    await sleep(800);

    const interval = window.setInterval(() => {
      setProcessingStepIndex((prev) => (prev + 1) % activeSteps.length);
    }, 1000);

    try {
      const startedAt = Date.now();
      const cartItemsPayload = items
        .map((item) => {
          const itemId =
            item.item_type === 'produit'
              ? item.produit_id
              : item.item_type === 'formation'
                ? item.formation_id
                : item.video_id;

          if (!itemId) return null;

          return {
            item_type: item.item_type,
            item_id: itemId,
            quantity: Math.max(1, Number(item.quantity || 1)),
            unit_price: Number(item.unit_price || 0),
          };
        })
        .filter((entry): entry is {
          item_type: 'produit' | 'formation' | 'video';
          item_id: string;
          quantity: number;
          unit_price: number;
        } => Boolean(entry));

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          paymentMethod,
          shipping: {
            first_name: shippingInfo.firstName,
            last_name: shippingInfo.lastName,
            email: shippingInfo.email,
            address: shippingInfo.address,
            city: shippingInfo.city,
            postal_code: shippingInfo.postalCode,
            country: shippingInfo.country,
            phone: shippingInfo.phone || null,
          },
          cart_items: cartItemsPayload,
        }),
      });

      const data = await response.json();
      const elapsed = Date.now() - startedAt;
      if (elapsed < 2500) {
        await sleep(2500 - elapsed);
      }

      if (!response.ok) {
        toast.error(data?.error || 'Paiement refuse.');
        return;
      }

      try {
        window.localStorage.removeItem('myke:guest-cart:v1');
      } catch {
        // ignore local storage cleanup errors
      }

      await refreshCart();
      toast.success('Verification terminee: paiement reussi (mode test).');
      router.push(`/checkout/succes?order=${encodeURIComponent(String(data.orderId || ''))}`);
    } catch (error) {
      console.error('Checkout request failed:', error);
      toast.error('Erreur reseau pendant le paiement.');
    } finally {
      window.clearInterval(interval);
      setIsProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4 text-center text-slate-600">
          Chargement du checkout...
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">Connexion requise</h1>
              <p className="text-slate-600 mb-6">
                Connectez-vous pour finaliser votre commande.
              </p>
              <Button onClick={() => router.push('/auth/connexion')}>Se connecter</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-screen bg-slate-50 py-12">
        <div className="max-w-4xl mx-auto px-4">
          <Card>
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">Panier vide</h1>
              <p className="text-slate-600 mb-6">
                Ajoutez des articles avant de passer a la caisse.
              </p>
              <Button onClick={() => router.push('/boutique/panier')}>Retour panier</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
          <button
            onClick={() => (step === 'payment' ? setStep('shipping') : router.push('/boutique/panier'))}
            className="flex items-center text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 'payment' ? 'Retour aux informations' : 'Retour au panier'}
          </button>

          <h1 className="text-3xl font-bold text-slate-900">Paiement</h1>

          <div className="flex items-center gap-4 mt-4">
            <div className={`flex items-center gap-2 ${step === 'shipping' ? 'text-blue-600' : 'text-green-600'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'shipping' ? 'bg-blue-100' : 'bg-green-100'}`}>
                {step === 'payment' ? <CheckCircle className="h-5 w-5" /> : <Truck className="h-5 w-5" />}
              </div>
              <span className="font-medium">Livraison</span>
            </div>
            <div className="flex-1 h-1 bg-slate-200 rounded">
              <div className={`h-full rounded transition-all ${step === 'payment' ? 'w-full bg-green-500' : 'w-0'}`} />
            </div>
            <div className={`flex items-center gap-2 ${step === 'payment' ? 'text-blue-600' : 'text-slate-400'}`}>
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === 'payment' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="font-medium">Paiement</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === 'shipping' ? (
              <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <CardContent className="p-6 text-slate-900">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">Informations de livraison</h2>

                    <form onSubmit={handleShippingSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-slate-700">Prenom *</Label>
                          <Input
                            id="firstName"
                            required
                            className="text-slate-900 placeholder:text-slate-400"
                            value={shippingInfo.firstName}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-slate-700">Nom *</Label>
                          <Input
                            id="lastName"
                            required
                            className="text-slate-900 placeholder:text-slate-400"
                            value={shippingInfo.lastName}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-slate-700">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          className="text-slate-900 placeholder:text-slate-400"
                          value={shippingInfo.email}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="address" className="text-slate-700">Adresse *</Label>
                        <Input
                          id="address"
                          required={orderSummary.hasPhysicalProducts}
                          className="text-slate-900 placeholder:text-slate-400"
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-slate-700">Ville *</Label>
                          <Input
                            id="city"
                            required={orderSummary.hasPhysicalProducts}
                            className="text-slate-900 placeholder:text-slate-400"
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode" className="text-slate-700">Code postal *</Label>
                          <Input
                            id="postalCode"
                            required={orderSummary.hasPhysicalProducts}
                            className="text-slate-900 placeholder:text-slate-400"
                            value={shippingInfo.postalCode}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="country" className="text-slate-700">Pays *</Label>
                          <select
                            id="country"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-slate-900"
                            value={shippingInfo.country}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="HT">Haiti</option>
                            <option value="FR">France</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-slate-700">Telephone</Label>
                          <Input
                            id="phone"
                            type="tel"
                            className="text-slate-900 placeholder:text-slate-400"
                            value={shippingInfo.phone}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, phone: e.target.value })}
                          />
                        </div>
                      </div>

                      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 h-12">
                        Continuer vers le paiement
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
                <Card>
                  <CardContent className="p-6 text-slate-900">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">Methode de paiement</h2>

                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                      <TabsList className="grid w-full grid-cols-2 mb-6 bg-slate-100">
                        <TabsTrigger value="card" className="flex items-center gap-2 text-slate-700 data-[state=active]:text-slate-900">
                          <CreditCard className="h-4 w-4" />
                          Carte bancaire
                        </TabsTrigger>
                        <TabsTrigger value="paypal" className="flex items-center gap-2 text-slate-700 data-[state=active]:text-slate-900">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.63l-1.496 9.478h2.79c.457 0 .85-.334.922-.788l.04-.19.73-4.627.047-.255a.933.933 0 0 1 .922-.788h.58c3.76 0 6.704-1.528 7.565-5.621.355-1.818.196-3.339-.507-4.004z" />
                          </svg>
                          PayPal
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="card">
                        <form onSubmit={handlePayment} className="space-y-4">
                          <div>
                            <Label htmlFor="cardName" className="text-slate-700">Nom sur la carte *</Label>
                            <Input
                              id="cardName"
                              required
                              placeholder="JEAN DUPONT"
                              className="text-slate-900 placeholder:text-slate-400"
                              value={cardInfo.name}
                              onChange={(e) => setCardInfo({ ...cardInfo, name: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label htmlFor="cardNumber" className="text-slate-700">Numero de carte *</Label>
                            <Input
                              id="cardNumber"
                              required
                              placeholder="4242 4242 4242 4242"
                              maxLength={19}
                              className="text-slate-900 placeholder:text-slate-400"
                              value={cardInfo.number}
                              onChange={(e) => {
                                const value = e.target.value
                                  .replace(/\s/g, '')
                                  .replace(/(\d{4})/g, '$1 ')
                                  .trim();
                                setCardInfo({ ...cardInfo, number: value });
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="expiry" className="text-slate-700">Date d&apos;expiration *</Label>
                              <Input
                                id="expiry"
                                required
                                placeholder="MM/AA"
                                maxLength={5}
                                className="text-slate-900 placeholder:text-slate-400"
                                value={cardInfo.expiry}
                                onChange={(e) => {
                                  let value = e.target.value.replace(/\D/g, '');
                                  if (value.length >= 2) {
                                    value = value.slice(0, 2) + '/' + value.slice(2, 4);
                                  }
                                  setCardInfo({ ...cardInfo, expiry: value });
                                }}
                              />
                            </div>
                            <div>
                              <Label htmlFor="cvc" className="text-slate-700">CVC *</Label>
                              <Input
                                id="cvc"
                                required
                                placeholder="123"
                                maxLength={4}
                                className="text-slate-900 placeholder:text-slate-400"
                                value={cardInfo.cvc}
                                onChange={(e) => setCardInfo({ ...cardInfo, cvc: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Lock className="h-4 w-4" />
                            <span>Paiement simule avec verification (mode test)</span>
                          </div>

                          <p className="text-sm text-slate-500">
                            {isProcessing
                              ? processingSteps[processingStepIndex]
                              : "Traitement de commande: jusqu'a 24h maximum pour la livraison."}
                          </p>

                          <Button
                            type="submit"
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              'Traitement en cours...'
                            ) : (
                              <>
                                Payer {formatPrice(orderSummary.total, 'USD')}
                                <Lock className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="paypal">
                        <div className="text-center py-8">
                          <p className="text-slate-600 mb-6">
                            Paiement PayPal simule. Cliquez pour confirmer la commande.
                          </p>
                          <Button
                            onClick={() => handlePayment()}
                            className="bg-[#0070BA] hover:bg-[#003087] h-12 px-8"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              'Traitement...'
                            ) : (
                              <>
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.63l-1.496 9.478h2.79c.457 0 .85-.334.922-.788l.04-.19.73-4.627.047-.255a.933.933 0 0 1 .922-.788h.58c3.76 0 6.704-1.528 7.565-5.621.355-1.818.196-3.339-.507-4.004z" />
                                </svg>
                                Confirmer avec PayPal
                              </>
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    </Tabs>
                  </CardContent>
                </Card>
              </motion.div>
            )}
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
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">Recapitulatif commande</h2>

                  <div className="space-y-3 mb-4">
                    {orderSummary.items.map((item, index) => (
                      <div key={`${item.name}-${index}`} className="flex justify-between text-sm gap-3">
                        <span className="text-slate-600 line-clamp-2">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-medium shrink-0">
                          {formatPrice(item.total, 'USD')}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Sous-total</span>
                      <span>{formatPrice(orderSummary.subtotal, 'USD')}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Livraison</span>
                      <span>
                        {orderSummary.shipping === 0
                          ? 'Gratuite'
                          : formatPrice(orderSummary.shipping, 'USD')}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatPrice(orderSummary.total, 'USD')}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Shield className="h-6 w-6 mx-auto text-green-500 mb-1" />
                        <span className="text-xs text-slate-500">Paiement securise</span>
                      </div>
                      <div>
                        <Clock className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                        <span className="text-xs text-slate-500">Max 24h de traitement</span>
                      </div>
                      <div>
                        <Package className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                        <span className="text-xs text-slate-500">Commande suivie</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
