"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/hooks/useAuth";
import { useCart } from "@/lib/hooks/useCart";
import { getPrimaryProductImage } from "@/lib/products";
import {
  calculateShippingQuote,
  getShippingCountryLabel,
  type ShippingRule,
} from "@/lib/shipping";
import { formatPrice } from "@/lib/utils/format";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowRight,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

function getItemTitle(item: ReturnType<typeof useCart>["items"][number]) {
  if (item.item_type === "produit") return item.produit?.name || "Produit";
  if (item.item_type === "formation") {
    return item.formation?.title || "Formation";
  }
  return item.video?.title || "Video";
}

function getItemImage(item: ReturnType<typeof useCart>["items"][number]) {
  if (item.item_type === "produit") {
    return (
      getPrimaryProductImage(item.produit?.images) ||
      "/images/placeholder-product.svg"
    );
  }
  if (item.item_type === "formation") {
    return item.formation?.thumbnail_url || "/images/placeholder-formation.svg";
  }
  return item.video?.thumbnail_url || "/images/placeholder-video.svg";
}

export default function CartPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { items, loading, removeItem, updateQuantity, clearCart } = useCart();

  const [shippingRules, setShippingRules] = useState<ShippingRule[]>([]);
  const [detectedCountry, setDetectedCountry] = useState("");
  const [appliedCountryCode, setAppliedCountryCode] = useState("default");

  useEffect(() => {
    const fetchRules = async () => {
      try {
        const res = await fetch("/api/shipping", { cache: "no-store" });
        if (res.ok) {
          const data = await res.json();
          setShippingRules(Array.isArray(data?.rules) ? data.rules : []);
          if (
            typeof data?.detectedCountry === "string" &&
            data.detectedCountry
          ) {
            setDetectedCountry(data.detectedCountry);
          }
          if (
            typeof data?.appliedCountryCode === "string" &&
            data.appliedCountryCode
          ) {
            setAppliedCountryCode(data.appliedCountryCode);
          }
        }
      } catch (err) {
        console.error("Failed to fetch shipping rules:", err);
      }
    };

    void fetchRules();
  }, []);

  const subtotal = items.reduce(
    (sum, item) => sum + item.unit_price * item.quantity,
    0,
  );

  const physicalItems = items.filter(
    (item) =>
      item.item_type === "produit" && !(item.produit?.is_digital ?? false),
  );
  const hasPhysicalProducts = physicalItems.length > 0;
  const physicalSubtotal = physicalItems.reduce(
    (sum, item) => sum + item.quantity * item.unit_price,
    0,
  );

  const shippingQuote = calculateShippingQuote({
    rules: shippingRules,
    countryCode: detectedCountry,
    physicalSubtotal,
    hasPhysicalProducts,
  });

  const shippingCost = shippingQuote.shippingCost;
  const total = subtotal + shippingCost;

  const handleCheckout = () => {
    if (!user) {
      toast.error("Connectez-vous pour finaliser la commande.");
      router.push("/auth/connexion");
      return;
    }
    router.push("/checkout");
  };

  const handleClearCart = async () => {
    await clearCart();
    toast.success("Panier vide.");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-4 text-center text-slate-500 sm:px-6 lg:px-8">
          Chargement du panier...
        </div>
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <ShoppingCart className="mx-auto mb-6 h-20 w-20 text-slate-300" />
          <h1 className="mb-2 text-2xl font-bold text-slate-900">
            Votre panier est vide
          </h1>
          <p className="mb-6 text-slate-500">
            Ajoutez des produits, formations ou videos.
          </p>
          <div className="flex justify-center gap-4">
            <Link href="/formations">
              <Button variant="outline">Voir les formations</Button>
            </Link>
            <Link href="/boutique">
              <Button className="bg-slate-900 text-gray-100 hover:bg-amber-500 hover:text-slate-950">
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
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <h1 className="text-3xl font-bold text-slate-900">
              Votre panier ({items.length} article{items.length > 1 ? "s" : ""})
            </h1>
            <Button variant="outline" onClick={handleClearCart}>
              Vider le panier
            </Button>
          </div>

          {!user && (
            <div className="mb-6 flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
              <p>
                Panier en mode invite. Connectez-vous et les articles seront
                synchronises automatiquement vers votre compte.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
            <div className="space-y-4 lg:col-span-2">
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
                        <div className="relative h-24 w-24 flex-shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          <Image
                            src={getItemImage(item)}
                            alt={getItemTitle(item)}
                            fill
                            className="object-cover"
                          />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="mb-1 text-sm text-slate-500">
                                {item.item_type === "produit"
                                  ? "Produit"
                                  : item.item_type === "formation"
                                    ? "Formation"
                                    : "Video"}
                              </p>
                              <h3 className="line-clamp-2 font-semibold text-slate-900">
                                {getItemTitle(item)}
                              </h3>
                              {item.item_type === "produit" &&
                                item.produit?.type === "chimique" && (
                                  <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                                    <AlertCircle className="h-3 w-3" />
                                    Produit chimique - vente reglementee
                                  </p>
                                )}
                            </div>
                            <button
                              onClick={() => removeItem(item.id)}
                              className="text-slate-400 transition-colors hover:text-red-500"
                            >
                              <Trash2 className="h-5 w-5" />
                            </button>
                          </div>

                          <div className="mt-4 flex items-center justify-between">
                            {item.item_type === "produit" ? (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity - 1)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-slate-50"
                                >
                                  <Minus className="h-4 w-4" />
                                </button>
                                <span className="w-8 text-center font-medium">
                                  {item.quantity}
                                </span>
                                <button
                                  onClick={() =>
                                    updateQuantity(item.id, item.quantity + 1)
                                  }
                                  className="flex h-8 w-8 items-center justify-center rounded-full border hover:bg-slate-50"
                                >
                                  <Plus className="h-4 w-4" />
                                </button>
                              </div>
                            ) : (
                              <p className="text-sm text-slate-500">
                                Quantite fixe: 1
                              </p>
                            )}

                            <div className="text-right">
                              <p className="font-semibold text-slate-900">
                                {formatPrice(
                                  item.unit_price * item.quantity,
                                  "USD",
                                )}
                              </p>
                              <p className="text-sm text-slate-500">
                                {formatPrice(item.unit_price, "USD")} / unite
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
                    <h2 className="mb-4 text-lg font-semibold text-slate-900">
                      Recapitulatif
                    </h2>
                    <div className="space-y-3">
                      <div className="flex justify-between text-slate-600">
                        <span>Sous-total</span>
                        <span>{formatPrice(subtotal, "USD")}</span>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Livraison</span>
                        <span>
                          {shippingCost === 0
                            ? "Gratuite"
                            : formatPrice(shippingCost, "USD")}
                        </span>
                      </div>
                      <Separator />
                      <div className="flex justify-between text-lg font-semibold text-slate-900">
                        <span>Total</span>
                        <span>{formatPrice(total, "USD")}</span>
                      </div>
                    </div>

                    <Button
                      className="mt-6 h-12 w-full bg-slate-900 text-gray-100 hover:bg-amber-500 hover:text-slate-950"
                      onClick={handleCheckout}
                    >
                      Passer a la caisse
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>

                    {hasPhysicalProducts ? (
                      <div className="mt-4 space-y-1 text-center text-xs text-slate-500">
                        <p>
                          Livraison gratuite a partir de{" "}
                          {formatPrice(
                            shippingQuote.rule?.free_threshold ?? 100,
                            "USD",
                          )}
                          .
                        </p>
                      </div>
                    ) : (
                      <p className="mt-4 text-center text-xs text-slate-500">
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
