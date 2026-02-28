'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  CreditCard, Truck, Lock, CheckCircle, ArrowLeft,
  Shield, Clock, Package 
} from 'lucide-react';
import { formatPrice } from '@/lib/utils/format';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const mockOrderSummary = {
  items: [
    { name: 'Acide sulfurique 98% - 1L', quantity: 2, price: 45.90 },
    { name: 'Introduction à la chimie industrielle', quantity: 1, price: 199 },
  ],
  subtotal: 290.80,
  discount: 0,
  shipping: 9.90,
  total: 300.70,
};

export default function CheckoutPage() {
  const router = useRouter();
  const [step, setStep] = useState<'shipping' | 'payment'>('shipping');
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'card' | 'paypal'>('card');
  
  // Form states
  const [shippingInfo, setShippingInfo] = useState({
    firstName: '',
    lastName: '',
    email: '',
    address: '',
    city: '',
    postalCode: '',
    country: 'FR',
    phone: '',
  });

  const [cardInfo, setCardInfo] = useState({
    number: '',
    expiry: '',
    cvc: '',
    name: '',
  });

  const handleShippingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('payment');
    window.scrollTo(0, 0);
  };

  const handlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);

    // Simulation de paiement
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Paiement réussi !');
      router.push('/checkout/succes');
    }, 3000);
  };

  const handlePayPalPayment = () => {
    setIsProcessing(true);
    
    // Simulation PayPal
    setTimeout(() => {
      setIsProcessing(false);
      toast.success('Paiement PayPal réussi !');
      router.push('/checkout/succes');
    }, 3000);
  };

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() => step === 'payment' ? setStep('shipping') : router.push('/boutique/panier')}
            className="flex items-center text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === 'payment' ? 'Retour aux informations' : 'Retour au panier'}
          </button>
          
          <h1 className="text-3xl font-bold text-slate-900">Paiement</h1>
          
          {/* Progress */}
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
          {/* Main Form */}
          <div className="lg:col-span-2">
            {step === 'shipping' ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">
                      Informations de livraison
                    </h2>
                    
                    <form onSubmit={handleShippingSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName">Prénom *</Label>
                          <Input
                            id="firstName"
                            required
                            value={shippingInfo.firstName}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, firstName: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName">Nom *</Label>
                          <Input
                            id="lastName"
                            required
                            value={shippingInfo.lastName}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, lastName: e.target.value })}
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={shippingInfo.email}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, email: e.target.value })}
                        />
                      </div>

                      <div>
                        <Label htmlFor="address">Adresse *</Label>
                        <Input
                          id="address"
                          required
                          value={shippingInfo.address}
                          onChange={(e) => setShippingInfo({ ...shippingInfo, address: e.target.value })}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city">Ville *</Label>
                          <Input
                            id="city"
                            required
                            value={shippingInfo.city}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, city: e.target.value })}
                          />
                        </div>
                        <div>
                          <Label htmlFor="postalCode">Code postal *</Label>
                          <Input
                            id="postalCode"
                            required
                            value={shippingInfo.postalCode}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, postalCode: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="country">Pays *</Label>
                          <select
                            id="country"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background"
                            value={shippingInfo.country}
                            onChange={(e) => setShippingInfo({ ...shippingInfo, country: e.target.value })}
                          >
                            <option value="FR">France</option>
                            <option value="BE">Belgique</option>
                            <option value="CH">Suisse</option>
                            <option value="DE">Allemagne</option>
                            <option value="ES">Espagne</option>
                            <option value="IT">Italie</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="phone">Téléphone</Label>
                          <Input
                            id="phone"
                            type="tel"
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
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardContent className="p-6">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">
                      Méthode de paiement
                    </h2>

                    <Tabs value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as 'card' | 'paypal')}>
                      <TabsList className="grid w-full grid-cols-2 mb-6">
                        <TabsTrigger value="card" className="flex items-center gap-2">
                          <CreditCard className="h-4 w-4" />
                          Carte bancaire
                        </TabsTrigger>
                        <TabsTrigger value="paypal" className="flex items-center gap-2">
                          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.63l-1.496 9.478h2.79c.457 0 .85-.334.922-.788l.04-.19.73-4.627.047-.255a.933.933 0 0 1 .922-.788h.58c3.76 0 6.704-1.528 7.565-5.621.355-1.818.196-3.339-.507-4.004z"/>
                          </svg>
                          PayPal
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent value="card">
                        <form onSubmit={handlePayment} className="space-y-4">
                          <div>
                            <Label htmlFor="cardName">Nom sur la carte *</Label>
                            <Input
                              id="cardName"
                              required
                              placeholder="JEAN DUPONT"
                              value={cardInfo.name}
                              onChange={(e) => setCardInfo({ ...cardInfo, name: e.target.value })}
                            />
                          </div>

                          <div>
                            <Label htmlFor="cardNumber">Numéro de carte *</Label>
                            <Input
                              id="cardNumber"
                              required
                              placeholder="4242 4242 4242 4242"
                              maxLength={19}
                              value={cardInfo.number}
                              onChange={(e) => {
                                const value = e.target.value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim();
                                setCardInfo({ ...cardInfo, number: value });
                              }}
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="expiry">Date d'expiration *</Label>
                              <Input
                                id="expiry"
                                required
                                placeholder="MM/AA"
                                maxLength={5}
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
                              <Label htmlFor="cvc">CVC *</Label>
                              <Input
                                id="cvc"
                                required
                                placeholder="123"
                                maxLength={4}
                                value={cardInfo.cvc}
                                onChange={(e) => setCardInfo({ ...cardInfo, cvc: e.target.value })}
                              />
                            </div>
                          </div>

                          <div className="flex items-center gap-2 text-sm text-slate-500">
                            <Lock className="h-4 w-4" />
                            <span>Paiement sécurisé par Stripe</span>
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full bg-blue-600 hover:bg-blue-700 h-12"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              'Traitement en cours...'
                            ) : (
                              <>
                                Payer {formatPrice(mockOrderSummary.total)}
                                <Lock className="ml-2 h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </form>
                      </TabsContent>

                      <TabsContent value="paypal">
                        <div className="text-center py-8">
                          <p className="text-slate-600 mb-6">
                            Vous allez être redirigé vers PayPal pour finaliser votre paiement.
                          </p>
                          <Button
                            onClick={handlePayPalPayment}
                            className="bg-[#0070BA] hover:bg-[#003087] h-12 px-8"
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              'Redirection...'
                            ) : (
                              <>
                                <svg className="h-5 w-5 mr-2" viewBox="0 0 24 24" fill="currentColor">
                                  <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944.901C5.026.382 5.474 0 5.998 0h7.46c2.57 0 4.578.543 5.69 1.81 1.01 1.15 1.304 2.42 1.012 4.287-.023.143-.047.288-.077.437-.983 5.05-4.349 6.797-8.647 6.797h-2.19c-.524 0-.968.382-1.05.9l-1.12 7.106zm14.146-14.42a3.35 3.35 0 0 0-.607-.541c-.013.076-.026.175-.041.254-.59 3.025-2.566 6.082-8.558 6.082H9.63l-1.496 9.478h2.79c.457 0 .85-.334.922-.788l.04-.19.73-4.627.047-.255a.933.933 0 0 1 .922-.788h.58c3.76 0 6.704-1.528 7.565-5.621.355-1.818.196-3.339-.507-4.004z"/>
                                </svg>
                                Payer avec PayPal
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

          {/* Order Summary */}
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
                    Récapitulatif de la commande
                  </h2>

                  {/* Items */}
                  <div className="space-y-3 mb-4">
                    {mockOrderSummary.items.map((item, index) => (
                      <div key={index} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-medium">{formatPrice(item.price * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  {/* Totals */}
                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Sous-total</span>
                      <span>{formatPrice(mockOrderSummary.subtotal)}</span>
                    </div>
                    {mockOrderSummary.discount > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>Réduction</span>
                        <span>-{formatPrice(mockOrderSummary.discount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-slate-600">
                      <span>Livraison</span>
                      <span>{formatPrice(mockOrderSummary.shipping)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatPrice(mockOrderSummary.total)}</span>
                    </div>
                  </div>

                  {/* Security Badges */}
                  <div className="mt-6 pt-6 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Shield className="h-6 w-6 mx-auto text-green-500 mb-1" />
                        <span className="text-xs text-slate-500">Paiement sécurisé</span>
                      </div>
                      <div>
                        <Clock className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                        <span className="text-xs text-slate-500">Livraison rapide</span>
                      </div>
                      <div>
                        <Package className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                        <span className="text-xs text-slate-500">Retours gratuits</span>
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
