"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCart } from "@/lib/hooks/useCart";
import { stripePromise } from "@/lib/stripe/client";
import { formatPrice } from "@/lib/utils/format";
import {
  Elements,
  PaymentElement,
  useElements,
  useStripe,
} from "@stripe/react-stripe-js";
import { motion } from "framer-motion";
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
} from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

interface ShippingInfo {
  firstName: string;
  lastName: string;
  email: string;
  address: string;
  city: string;
  postalCode: string;
  country: string;
  phone: string;
}

function buildOrderSummary(items: ReturnType<typeof useCart>["items"]) {
  const mappedItems = items.map((item) => {
    const name =
      item.item_type === "produit"
        ? item.produit?.name || "Produit"
        : item.item_type === "formation"
          ? item.formation?.title || "Formation"
          : item.video?.title || "Video";
    return {
      name,
      quantity: item.quantity,
      total: item.quantity * item.unit_price,
    };
  });

  const subtotal = mappedItems.reduce((sum, item) => sum + item.total, 0);
  const hasPhysicalProducts = items.some(
    (item) =>
      item.item_type === "produit" && !(item.produit?.is_digital ?? false),
  );
  const shipping = hasPhysicalProducts ? (subtotal >= 100 ? 0 : 9.9) : 0;
  const total = subtotal + shipping;

  return { items: mappedItems, subtotal, shipping, total, hasPhysicalProducts };
}

function StripePaymentForm({
  orderId,
  totalAmount,
  currency,
  shippingCountry,
  shippingPostalCode,
  shippingAddress,
  shippingCity,
  onPaid,
}: {
  orderId: string;
  totalAmount: number;
  currency: string;
  shippingCountry: string;
  shippingPostalCode: string;
  shippingAddress: string;
  shippingCity: string;
  onPaid: (paymentIntentId: string) => Promise<void>;
}) {
  const stripe = useStripe();
  const elements = useElements();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) {
      setErrorMessage(
        "Le service de paiement n est pas encore pret. Reessayez dans quelques secondes.",
      );
      return;
    }

    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: "if_required",
        confirmParams: {
          return_url: `${window.location.origin}/checkout/succes?order=${encodeURIComponent(orderId)}`,
          payment_method_data: {
            billing_details: {
              address: {
                country: shippingCountry,
                postal_code: shippingPostalCode,
                line1: shippingAddress || undefined,
                city: shippingCity || undefined,
                state: shippingCity || undefined, // A fallback state, required when address is hidden
              },
            },
          },
        },
      });

      if (error) {
        const message = error.message || "Paiement refuse.";
        setErrorMessage(message);
        toast.error(message);
        return;
      }

      if (
        paymentIntent &&
        (paymentIntent.status === "succeeded" ||
          paymentIntent.status === "processing" ||
          paymentIntent.status === "requires_capture")
      ) {
        await onPaid(paymentIntent.id);
        return;
      }

      setErrorMessage(
        "Verification du paiement en cours. Consultez votre historique ensuite.",
      );
    } catch (error) {
      console.error("Stripe confirm error:", error);
      setErrorMessage("Erreur pendant la confirmation du paiement.");
      toast.error("Erreur pendant la confirmation du paiement.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <PaymentElement
          options={{
            layout: "tabs",
            paymentMethodOrder: ["card"],
            terms: { card: "never" },
            wallets: { applePay: "never", googlePay: "never" },
            fields: {
              billingDetails: {
                address: "never",
              },
            },
          }}
        />
      </div>

      {errorMessage && (
        <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{errorMessage}</p>
        </div>
      )}

      <div className="flex items-center gap-2 text-sm text-slate-500">
        <Lock className="h-4 w-4" />
        <span>Paiement securise (SSL + conformite PCI)</span>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 h-12"
        disabled={isSubmitting || !stripe || !elements}
      >
        {isSubmitting
          ? "Traitement en cours..."
          : `Payer ${formatPrice(totalAmount, currency)}`}
      </Button>
    </form>
  );
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, refreshCart } = useCart();

  const [step, setStep] = useState<"shipping" | "payment">("shipping");
  const [isPreparingPayment, setIsPreparingPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currentOrderId, setCurrentOrderId] = useState<string | null>(null);
  const [paymentInitError, setPaymentInitError] = useState<string | null>(null);

  const [shippingInfo, setShippingInfo] = useState<ShippingInfo>({
    firstName: "",
    lastName: "",
    email: "",
    address: "",
    city: "",
    postalCode: "",
    country: "US",
    phone: "",
  });

  useEffect(() => {
    if (!user) return;
    const fullName = (user.full_name || "").trim();
    const [firstName, ...rest] = fullName.split(" ");
    const lastName = rest.join(" ");
    setShippingInfo((prev) => ({
      ...prev,
      firstName: prev.firstName || firstName || "",
      lastName: prev.lastName || lastName || "",
      email: prev.email || user.email || "",
    }));
  }, [user]);

  const orderSummary = useMemo(() => buildOrderSummary(items), [items]);
  const canCheckout = Boolean(user) && !loading && items.length > 0;

  const checkoutPayload = useMemo(() => {
    return items
      .map((item) => {
        const itemId =
          item.item_type === "produit"
            ? item.produit_id
            : item.item_type === "formation"
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
      .filter(
        (
          entry,
        ): entry is {
          item_type: "produit" | "formation" | "video";
          item_id: string;
          quantity: number;
          unit_price: number;
        } => Boolean(entry),
      );
  }, [items]);

  const initStripePayment = async () => {
    setIsPreparingPayment(true);
    setPaymentInitError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: "card",
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
          cart_items: checkoutPayload,
        }),
      });

      const data = await response.json().catch(() => null);
      if (!response.ok) {
        const message = data?.error || "Impossible de preparer le paiement.";
        setPaymentInitError(message);
        toast.error(message);
        return false;
      }

      const nextClientSecret =
        typeof data?.clientSecret === "string" ? data.clientSecret : "";
      const nextOrderId = typeof data?.orderId === "string" ? data.orderId : "";
      if (!nextClientSecret || !nextOrderId) {
        setPaymentInitError("Session de paiement invalide.");
        return false;
      }

      setClientSecret(nextClientSecret);
      setCurrentOrderId(nextOrderId);
      return true;
    } catch (error) {
      console.error("Checkout init error:", error);
      setPaymentInitError("Erreur reseau pendant la preparation du paiement.");
      toast.error("Erreur reseau pendant la preparation du paiement.");
      return false;
    } finally {
      setIsPreparingPayment(false);
    }
  };

  const handleShippingSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!canCheckout) {
      toast.error("Impossible de continuer le checkout.");
      return;
    }

    const ready = await initStripePayment();
    if (!ready) return;

    setStep("payment");
    window.scrollTo(0, 0);
  };

  const handlePaymentSuccess = async (paymentIntentId: string) => {
    if (!currentOrderId) {
      toast.error("Commande introuvable pour finaliser le paiement.");
      return;
    }

    try {
      const response = await fetch("/api/checkout/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: currentOrderId,
          paymentIntentId,
        }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok && data?.error) {
        toast.error(data.error);
      }
    } catch (error) {
      console.error("Checkout confirm client warning:", error);
    }

    try {
      window.localStorage.removeItem("myke:guest-cart:v1");
    } catch {
      // ignore local storage cleanup errors
    }

    await refreshCart();
    router.push(
      `/checkout/succes?order=${encodeURIComponent(currentOrderId)}&payment_intent=${encodeURIComponent(paymentIntentId)}`,
    );
  };

  const elementsOptions = useMemo(() => {
    if (!clientSecret) return null;
    return {
      clientSecret,
      appearance: {
        theme: "stripe" as const,
        variables: {
          colorPrimary: "#0f172a",
          colorText: "#0f172a",
          colorDanger: "#b91c1c",
          borderRadius: "10px",
        },
      },
      paymentMethodOrder: ["card"],
      paymentMethodCreation: "manual" as const,
    };
  }, [clientSecret]);

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
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Connexion requise
              </h1>
              <p className="text-slate-600 mb-6">
                Connectez-vous pour finaliser votre commande.
              </p>
              <Button onClick={() => router.push("/auth/connexion")}>
                Se connecter
              </Button>
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
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Panier vide
              </h1>
              <p className="text-slate-600 mb-6">
                Ajoutez des articles avant de passer a la caisse.
              </p>
              <Button onClick={() => router.push("/boutique/panier")}>
                Retour panier
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <button
            onClick={() =>
              step === "payment"
                ? setStep("shipping")
                : router.push("/boutique/panier")
            }
            className="flex items-center text-slate-500 hover:text-slate-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            {step === "payment"
              ? "Retour aux informations"
              : "Retour au panier"}
          </button>

          <h1 className="text-3xl font-bold text-slate-900">
            Paiement par carte
          </h1>

          <div className="flex items-center gap-4 mt-4">
            <div
              className={`flex items-center gap-2 ${step === "shipping" ? "text-blue-600" : "text-green-600"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "shipping" ? "bg-blue-100" : "bg-green-100"}`}
              >
                {step === "payment" ? (
                  <CheckCircle className="h-5 w-5" />
                ) : (
                  <Truck className="h-5 w-5" />
                )}
              </div>
              <span className="font-medium">Livraison</span>
            </div>
            <div className="flex-1 h-1 bg-slate-200 rounded">
              <div
                className={`h-full rounded transition-all ${step === "payment" ? "w-full bg-green-500" : "w-0"}`}
              />
            </div>
            <div
              className={`flex items-center gap-2 ${step === "payment" ? "text-blue-600" : "text-slate-400"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center ${step === "payment" ? "bg-blue-100" : "bg-slate-100"}`}
              >
                <CreditCard className="h-5 w-5" />
              </div>
              <span className="font-medium">Paiement</span>
            </div>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2">
            {step === "shipping" ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
              >
                <Card>
                  <CardContent className="p-6 text-slate-900">
                    <h2 className="text-xl font-semibold text-slate-900 mb-6">
                      Informations de livraison
                    </h2>

                    <form onSubmit={handleShippingSubmit} className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="firstName" className="text-slate-700">
                            Prenom *
                          </Label>
                          <Input
                            id="firstName"
                            required
                            value={shippingInfo.firstName}
                            onChange={(e) =>
                              setShippingInfo({
                                ...shippingInfo,
                                firstName: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label htmlFor="lastName" className="text-slate-700">
                            Nom *
                          </Label>
                          <Input
                            id="lastName"
                            required
                            value={shippingInfo.lastName}
                            onChange={(e) =>
                              setShippingInfo({
                                ...shippingInfo,
                                lastName: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="email" className="text-slate-700">
                          Email *
                        </Label>
                        <Input
                          id="email"
                          type="email"
                          required
                          value={shippingInfo.email}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              email: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="address" className="text-slate-700">
                          Adresse *
                        </Label>
                        <Input
                          id="address"
                          required={orderSummary.hasPhysicalProducts}
                          value={shippingInfo.address}
                          onChange={(e) =>
                            setShippingInfo({
                              ...shippingInfo,
                              address: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="city" className="text-slate-700">
                            Ville *
                          </Label>
                          <Input
                            id="city"
                            required={orderSummary.hasPhysicalProducts}
                            value={shippingInfo.city}
                            onChange={(e) =>
                              setShippingInfo({
                                ...shippingInfo,
                                city: e.target.value,
                              })
                            }
                          />
                        </div>
                        <div>
                          <Label
                            htmlFor="postalCode"
                            className="text-slate-700"
                          >
                            Code postal *
                          </Label>
                          <Input
                            id="postalCode"
                            required={orderSummary.hasPhysicalProducts}
                            value={shippingInfo.postalCode}
                            onChange={(e) =>
                              setShippingInfo({
                                ...shippingInfo,
                                postalCode: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="country" className="text-slate-700">
                            Pays *
                          </Label>
                          <select
                            id="country"
                            className="w-full h-10 px-3 rounded-md border border-input bg-background text-slate-900"
                            value={shippingInfo.country}
                            onChange={(e) =>
                              setShippingInfo({
                                ...shippingInfo,
                                country: e.target.value,
                              })
                            }
                          >
                            <option value="US">United States</option>
                            <option value="CA">Canada</option>
                            <option value="HT">Haiti</option>
                            <option value="FR">France</option>
                          </select>
                        </div>
                        <div>
                          <Label htmlFor="phone" className="text-slate-700">
                            Telephone
                          </Label>
                          <Input
                            id="phone"
                            type="tel"
                            value={shippingInfo.phone}
                            onChange={(e) =>
                              setShippingInfo({
                                ...shippingInfo,
                                phone: e.target.value,
                              })
                            }
                          />
                        </div>
                      </div>

                      <Button
                        type="submit"
                        className="w-full bg-gray-800 text-gray-100 hover:bg-gray-700 h-12"
                        disabled={isPreparingPayment}
                      >
                        {isPreparingPayment
                          ? "Preparation du paiement..."
                          : "Continuer vers le paiement"}
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
                  <CardContent className="p-6 text-slate-900 space-y-5">
                    <h2 className="text-xl font-semibold text-slate-900">
                      Paiement securise
                    </h2>

                    {paymentInitError && (
                      <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-900 flex gap-2">
                        <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>{paymentInitError}</p>
                      </div>
                    )}

                    {!clientSecret || !currentOrderId ? (
                      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-amber-900 text-sm space-y-3">
                        <p>
                          Session de paiement invalide. Relancez la preparation.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => void initStripePayment()}
                          disabled={isPreparingPayment}
                        >
                          {isPreparingPayment
                            ? "Preparation..."
                            : "Relancer la session de paiement"}
                        </Button>
                      </div>
                    ) : stripePromise && elementsOptions ? (
                      <Elements
                        stripe={stripePromise}
                        options={elementsOptions}
                      >
                        <StripePaymentForm
                          orderId={currentOrderId}
                          totalAmount={orderSummary.total}
                          currency="USD"
                          shippingCountry={shippingInfo.country}
                          shippingPostalCode={shippingInfo.postalCode}
                          shippingAddress={shippingInfo.address}
                          shippingCity={shippingInfo.city}
                          onPaid={handlePaymentSuccess}
                        />
                      </Elements>
                    ) : (
                      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-900 text-sm">
                        Service de paiement indisponible pour le moment.
                        Reessayez plus tard.
                      </div>
                    )}
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
                  <h2 className="text-lg font-semibold text-slate-900 mb-4">
                    Recapitulatif commande
                  </h2>

                  <div className="space-y-3 mb-4">
                    {orderSummary.items.map((item, index) => (
                      <div
                        key={`${item.name}-${index}`}
                        className="flex justify-between text-sm gap-3"
                      >
                        <span className="text-slate-600 line-clamp-2">
                          {item.name} x{item.quantity}
                        </span>
                        <span className="font-medium shrink-0">
                          {formatPrice(item.total, "USD")}
                        </span>
                      </div>
                    ))}
                  </div>

                  <Separator className="my-4" />

                  <div className="space-y-2">
                    <div className="flex justify-between text-slate-600">
                      <span>Sous-total</span>
                      <span>{formatPrice(orderSummary.subtotal, "USD")}</span>
                    </div>
                    <div className="flex justify-between text-slate-600">
                      <span>Livraison</span>
                      <span>
                        {orderSummary.shipping === 0
                          ? "Gratuite"
                          : formatPrice(orderSummary.shipping, "USD")}
                      </span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold text-slate-900">
                      <span>Total</span>
                      <span>{formatPrice(orderSummary.total, "USD")}</span>
                    </div>
                  </div>

                  <div className="mt-6 pt-6 border-t">
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <Shield className="h-6 w-6 mx-auto text-green-500 mb-1" />
                        <span className="text-xs text-slate-500">
                          Paiement securise
                        </span>
                      </div>
                      <div>
                        <Clock className="h-6 w-6 mx-auto text-blue-500 mb-1" />
                        <span className="text-xs text-slate-500">
                          Validation serveur
                        </span>
                      </div>
                      <div>
                        <Package className="h-6 w-6 mx-auto text-amber-500 mb-1" />
                        <span className="text-xs text-slate-500">
                          Historique trace
                        </span>
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
