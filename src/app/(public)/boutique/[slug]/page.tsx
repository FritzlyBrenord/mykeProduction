"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  BadgeCheck,
  Beaker,
  FileText,
  Minus,
  Package,
  Plus,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Truck,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import ProductCard from "@/components/cards/ProductCard";
import ShareButton from "@/components/share/ShareButton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/hooks/useCart";
import { getPrimaryProductImage } from "@/lib/products";
import { Produit } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";

type ProductListResponse = {
  data?: Produit[];
};

function getTypeLabel(type: Produit["type"]) {
  if (type === "chimique") return "Produit chimique";
  if (type === "document") return "Document technique";
  return "Produit";
}

function getTypeIcon(type: Produit["type"]) {
  if (type === "chimique") return Beaker;
  if (type === "document") return FileText;
  return Package;
}

function getTypeTheme(type: Produit["type"]) {
  if (type === "chimique") {
    return {
      chip: "bg-amber-100 text-amber-900 border-amber-200",
      panel: "border-amber-200 bg-amber-50",
      accent: "from-amber-500/15 via-orange-500/10 to-transparent",
    };
  }
  if (type === "document") {
    return {
      chip: "bg-cyan-100 text-cyan-900 border-cyan-200",
      panel: "border-cyan-200 bg-cyan-50",
      accent: "from-cyan-500/15 via-sky-500/10 to-transparent",
    };
  }
  return {
    chip: "bg-slate-100 text-slate-800 border-slate-200",
    panel: "border-slate-200 bg-slate-50",
    accent: "from-slate-500/15 via-slate-400/10 to-transparent",
  };
}

export default function BoutiqueProductDetailPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const { addItem } = useCart();

  const [produit, setProduit] = useState<Produit | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Produit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);

  const contentRef = useRef<HTMLElement | null>(null);

  const slug = useMemo(() => {
    if (!params?.slug) return "";
    return Array.isArray(params.slug) ? params.slug[0] : params.slug;
  }, [params]);

  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      if (!slug) return;

      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch(
          `/api/produits/${encodeURIComponent(slug)}`,
          {
            method: "GET",
            cache: "no-store",
          },
        );

        if (!response.ok) {
          if (response.status === 404) {
            throw new Error("Produit introuvable.");
          }
          throw new Error("Impossible de charger ce produit.");
        }

        const data = (await response.json()) as Produit;
        if (!active) return;
        setProduit(data);

        const relatedResponse = await fetch(
          `/api/produits?limit=3&page=1&exclude=${encodeURIComponent(slug)}`,
          { method: "GET", cache: "no-store" },
        );

        if (!relatedResponse.ok) {
          if (!active) return;
          setRelatedProducts([]);
          return;
        }

        const relatedPayload = (await relatedResponse.json()) as
          | ProductListResponse
          | Produit[];
        const rows = Array.isArray(relatedPayload)
          ? relatedPayload
          : (relatedPayload.data ?? []);
        if (!active) return;
        setRelatedProducts(Array.isArray(rows) ? rows : []);
      } catch (error) {
        if (!active) return;
        setProduit(null);
        setRelatedProducts([]);
        setFetchError(
          error instanceof Error
            ? error.message
            : "Erreur pendant le chargement du produit.",
        );
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    void loadProduct();

    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!produit) return;
    setSelectedImageIndex(0);
    setQuantity(Math.max(1, Number(produit.min_order || 1)));
  }, [produit]);

  useEffect(() => {
    const root = contentRef.current;
    if (!root) return;

    root.querySelectorAll("table").forEach((table) => {
      if (table.parentElement?.classList.contains("product-table-wrap")) return;

      const wrapper = document.createElement("div");
      wrapper.className =
        "product-table-wrap my-6 w-full overflow-x-auto rounded-xl border border-slate-200 bg-white";
      table.parentNode?.insertBefore(wrapper, table);
      wrapper.appendChild(table);

      table.classList.add("w-full", "min-w-[680px]", "border-collapse");
      table.querySelectorAll("th").forEach((th) => {
        th.classList.add(
          "border",
          "border-slate-200",
          "bg-slate-100",
          "px-3",
          "py-2",
          "text-left",
          "text-sm",
          "font-semibold",
          "text-slate-900",
        );
      });
      table.querySelectorAll("td").forEach((td) => {
        td.classList.add(
          "border",
          "border-slate-200",
          "px-3",
          "py-2",
          "align-top",
          "text-sm",
          "text-slate-700",
        );
      });
    });
  }, [produit?.content]);

  const minOrderQuantity = Math.max(1, Number(produit?.min_order || 1));
  const isInStock = produit
    ? produit.stock === null || produit.stock > 0
    : false;
  const maxQuantity =
    produit?.stock === null || produit?.stock == null
      ? 999
      : Math.max(1, produit.stock);
  const TypeIcon = getTypeIcon(produit?.type || "autre");
  const typeTheme = getTypeTheme(produit?.type || "autre");

  const images = useMemo(() => {
    if (!produit) return ["/images/placeholder-product.svg"];
    const list = (produit.images || []).filter(Boolean);
    if (list.length > 0) return list;
    return [
      getPrimaryProductImage(produit.images) ||
        "/images/placeholder-product.svg",
    ];
  }, [produit]);

  const selectedImage =
    images[Math.min(selectedImageIndex, Math.max(0, images.length - 1))];

  const handleAddToCart = async (buyNow = false) => {
    if (!produit || isAdding) return;
    if (!isInStock) {
      toast.error("Produit en rupture de stock.");
      return;
    }
    if (produit.stock !== null && quantity > produit.stock) {
      toast.error("Quantite superieure au stock disponible.");
      return;
    }

    try {
      setIsAdding(true);
      await addItem({
        item_type: "produit",
        item_id: produit.id,
        unit_price: produit.price,
        quantity,
        item_name: produit.name,
        item_image: selectedImage,
        produit_type: produit.type,
        is_digital: produit.is_digital,
      });
      toast.success("Produit ajoute au panier.");
      if (buyNow) {
        router.push("/boutique/panier");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Erreur d'ajout au panier.";
      toast.error(message);
    } finally {
      setIsAdding(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28">
        <div className="mx-auto max-w-6xl px-4 py-16 text-center text-slate-500">
          Chargement du produit...
        </div>
      </div>
    );
  }

  if (!produit || fetchError) {
    return (
      <div className="min-h-screen bg-slate-50 pt-28">
        <div className="mx-auto max-w-3xl px-4 py-16 text-center">
          <h1 className="font-[family-name:var(--font-playfair)] text-3xl font-semibold text-slate-900">
            Produit indisponible
          </h1>
          <p className="mt-3 text-slate-600">
            {fetchError || "Ce produit n'est pas disponible."}
          </p>
          <Link href="/boutique">
            <Button variant="outline" className="mt-6">
              Retour boutique
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pt-24 pb-14">
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Link
            href="/boutique"
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Retour à la boutique
          </Link>

          <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
            {/* Images - Left Side */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="space-y-4"
            >
              {/* Main Image */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-white border border-slate-200 shadow-sm">
                <Image
                  src={selectedImage}
                  alt={produit.name}
                  fill
                  className="object-cover"
                  priority
                />
                {produit.featured && (
                  <div className="absolute top-4 left-4">
                    <Badge className="bg-slate-900 text-white font-medium px-3 py-1">
                      Premium
                    </Badge>
                  </div>
                )}
              </div>

              {/* Thumbnail Gallery */}
              {images.length > 1 && (
                <div className="flex gap-3 overflow-x-auto pb-2">
                  {images.map((image, index) => (
                    <button
                      key={`${image}-${index}`}
                      onClick={() => setSelectedImageIndex(index)}
                      className={`relative h-20 w-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all ${
                        selectedImageIndex === index
                          ? "border-slate-900 ring-2 ring-slate-200"
                          : "border-slate-200 hover:border-slate-300"
                      }`}
                    >
                      <Image
                        src={image}
                        alt={`${produit.name} ${index + 1}`}
                        fill
                        className="object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>

            {/* Product Info - Right Side */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="space-y-6"
            >
              {/* Header */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <Badge className={typeTheme.chip}>
                    <TypeIcon className="mr-1.5 h-3.5 w-3.5" />
                    {getTypeLabel(produit.type)}
                  </Badge>
                  {produit.type === "chimique" && produit.signal_word && (
                    <Badge
                      variant="destructive"
                      className="bg-red-500 text-white"
                    >
                      <AlertTriangle className="mr-1 h-3 w-3" />
                      {produit.signal_word}
                    </Badge>
                  )}
                </div>
                <h1 className="font-[family-name:var(--font-playfair)] text-3xl lg:text-4xl font-semibold text-slate-900 leading-tight">
                  {produit.name}
                </h1>
                {produit.description && (
                  <p className="mt-4 text-slate-600 text-lg leading-relaxed">
                    {produit.description}
                  </p>
                )}
              </div>

              {/* Price */}
              <div className="py-4 border-y border-slate-200">
                <p className="text-3xl lg:text-4xl font-bold text-slate-900">
                  {formatPrice(Number(produit.price) || 0, "USD")}
                </p>
                <p className="text-sm text-slate-500 mt-1">Prix TTC</p>
              </div>

              {/* Stock & Delivery Info */}
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-500">
                      Disponibilité
                    </span>
                  </div>
                  <p
                    className={
                      isInStock
                        ? "text-emerald-700 font-semibold"
                        : "text-red-600 font-semibold"
                    }
                  >
                    {produit.stock === null
                      ? "Stock illimité"
                      : produit.stock > 0
                        ? `${produit.stock} en stock`
                        : "Rupture de stock"}
                  </p>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-center gap-2 mb-1">
                    <Truck className="h-4 w-4 text-slate-400" />
                    <span className="text-sm text-slate-500">Livraison</span>
                  </div>
                  <p className="text-slate-900 font-semibold">
                    {produit.is_digital
                      ? "Téléchargement numérique"
                      : "Expédition physique"}
                  </p>
                </div>
              </div>

              {/* Min Order */}
              {minOrderQuantity > 1 && (
                <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded-lg px-4 py-3 border border-amber-200">
                  <BadgeCheck className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    Quantité minimum de commande : {minOrderQuantity}{" "}
                    {produit.unit || "unités"}
                  </span>
                </div>
              )}

              {/* Quantity Selector */}
              <div>
                <label className="text-sm font-medium text-slate-700 mb-2 block">
                  Quantité
                </label>
                <div className="flex items-center gap-3">
                  <div className="flex items-center border border-slate-200 rounded-lg bg-white">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-none rounded-l-lg"
                      onClick={() =>
                        setQuantity((q) => Math.max(minOrderQuantity, q - 1))
                      }
                      disabled={quantity <= minOrderQuantity || isAdding}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <div className="h-11 w-16 flex items-center justify-center font-semibold text-slate-900 border-x border-slate-200">
                      {quantity}
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-11 w-11 rounded-none rounded-r-lg"
                      onClick={() =>
                        setQuantity((q) => Math.min(maxQuantity, q + 1))
                      }
                      disabled={
                        isAdding ||
                        (produit.stock !== null && quantity >= maxQuantity)
                      }
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  {produit.unit && (
                    <span className="text-slate-500">{produit.unit}</span>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="space-y-3 pt-2">
                <Button
                  onClick={() => handleAddToCart(false)}
                  className="w-full h-12 bg-slate-900 hover:bg-amber-500 hover:text-slate-950 text-base font-medium"
                  disabled={!isInStock || isAdding}
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  {isAdding ? "Ajout en cours..." : "Ajouter au panier"}
                </Button>
                <Button
                  variant="outline"
                  className="w-full h-12 text-base font-medium"
                  onClick={() => handleAddToCart(true)}
                  disabled={!isInStock || isAdding}
                >
                  Commander maintenant
                </Button>
                <ShareButton
                  title={produit.name}
                  text={produit.description || "Decouvrez ce produit"}
                  path={`/boutique/${produit.slug}`}
                  size="lg"
                  variant="outline"
                  buttonClassName="w-full h-12 text-base font-medium"
                  className="text-black"
                />
              </div>

              {/* Trust Badges */}
              <div className="flex flex-wrap gap-4 text-xs text-slate-500 pt-2">
                <div className="flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  <span>Paiement sécurisé</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <BadgeCheck className="h-4 w-4 text-amber-600" />
                  <span>Qualité contrôlée</span>
                </div>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-200">
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Référence
                  </p>
                  <p className="text-sm font-medium text-slate-900 mt-1 break-all">
                    {produit.slug}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase tracking-wider">
                    Type
                  </p>
                  <p className="text-sm font-medium text-slate-900 mt-1">
                    {getTypeLabel(produit.type)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* Content & Specs Section */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {produit.content && (
              <div className="rounded-2xl border border-slate-200 bg-white p-6 lg:p-8 text-gray-800">
                <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900 mb-4">
                  Description détaillée
                </h2>
                <article
                  ref={contentRef}
                  className="prose prose-slate max-w-none
                             [&_h2]:font-[family-name:var(--font-playfair)] [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_h2]:mt-6 [&_h2]:mb-3
                             [&_h3]:font-semibold [&_h3]:text-slate-900 [&_h3]:mt-4 [&_h3]:mb-2
                             [&_p]:text-slate-600 [&_p]:leading-7 [&_p]:mb-4
                             [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1 [&_ul]:mb-4
                             [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1 [&_ol]:mb-4
                             [&_li]:text-slate-600
                             [&_a]:text-amber-700 [&_a]:underline [&_a]:hover:text-amber-800
                             [&_blockquote]:border-l-4 [&_blockquote]:border-amber-300 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-slate-500"
                  dangerouslySetInnerHTML={{ __html: produit.content }}
                />
              </div>
            )}

            {/* Chemical Safety Info */}
            {produit.type === "chimique" && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
                <h3 className="font-semibold text-amber-900 mb-4 flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5" />
                  Informations de sécurité
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  {produit.cas_number && (
                    <div>
                      <span className="text-xs text-amber-700 uppercase">
                        Numéro CAS
                      </span>
                      <p className="text-sm font-medium text-amber-900">
                        {produit.cas_number}
                      </p>
                    </div>
                  )}
                  {produit.purity && (
                    <div>
                      <span className="text-xs text-amber-700 uppercase">
                        Pureté
                      </span>
                      <p className="text-sm font-medium text-amber-900">
                        {produit.purity}
                      </p>
                    </div>
                  )}
                  {produit.signal_word && (
                    <div>
                      <span className="text-xs text-amber-700 uppercase">
                        Mot de signal
                      </span>
                      <p className="text-sm font-medium text-amber-900">
                        {produit.signal_word}
                      </p>
                    </div>
                  )}
                  {produit.adr_class && (
                    <div>
                      <span className="text-xs text-amber-700 uppercase">
                        Classe ADR
                      </span>
                      <p className="text-sm font-medium text-amber-900">
                        {produit.adr_class}
                      </p>
                    </div>
                  )}
                </div>
                {(produit.ghs_pictograms || []).length > 0 && (
                  <div className="mt-4 pt-4 border-t border-amber-200">
                    <span className="text-xs text-amber-700 uppercase block mb-2">
                      Pictogrammes de danger
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {produit.ghs_pictograms.map((code) => (
                        <Badge
                          key={code}
                          variant="outline"
                          className="border-amber-300 text-amber-900"
                        >
                          {code}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Document Download */}
            {produit.type === "document" && produit.file_url && (
              <div className="rounded-2xl border border-cyan-200 bg-cyan-50 p-6">
                <h3 className="font-semibold text-cyan-900 mb-2">
                  Document numérique
                </h3>
                <p className="text-sm text-cyan-700 mb-4">
                  Ce document sera disponible en téléchargement immédiatement
                  après validation du paiement.
                </p>
                <a
                  href={produit.file_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-cyan-800 hover:text-cyan-900 underline"
                >
                  <FileText className="h-4 w-4" />
                  Voir l&apos;aperçu
                </a>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6">
              <h3 className="font-semibold text-slate-900 mb-4">
                Caractéristiques
              </h3>
              <dl className="space-y-3">
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Type</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {getTypeLabel(produit.type)}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Référence</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {produit.slug}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-sm text-slate-500">Format</dt>
                  <dd className="text-sm font-medium text-slate-900">
                    {produit.is_digital ? "Numérique" : "Physique"}
                  </dd>
                </div>
                {produit.unit && (
                  <div className="flex justify-between">
                    <dt className="text-sm text-slate-500">Unité</dt>
                    <dd className="text-sm font-medium text-slate-900">
                      {produit.unit}
                    </dd>
                  </div>
                )}
              </dl>
            </div>

            {/* Chemical Note */}
            {produit.type === "chimique" && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-sm text-amber-800">
                  Vérification réglementaire possible avant expédition selon le
                  profil du produit.
                </p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {relatedProducts.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="mb-6 flex items-center gap-2 text-amber-600">
            <Sparkles className="h-5 w-5" />
            <span className="text-sm uppercase tracking-wider font-medium">
              Produits similaires
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {relatedProducts.map((item, index) => (
              <ProductCard key={item.id} produit={item} index={index} />
            ))}
          </div>
        </section>
      )}

      {/* Stock Alert */}
      {!isInStock && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 z-40">
          <div className="rounded-full border border-red-200 bg-white px-4 py-2 text-sm text-red-700 shadow-lg inline-flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Ce produit est actuellement en rupture de stock.
          </div>
        </div>
      )}
    </div>
  );
}
