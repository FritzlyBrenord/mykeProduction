"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Search, Sparkles, X, Beaker, FileText, Package, ShoppingBag } from "lucide-react";

import ProductCard from "@/components/cards/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { Produit } from "@/lib/types";

type ProductsResponse = {
  data?: Produit[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const productTypes = [
  { value: "all", label: "Tous", icon: ShoppingBag },
  { value: "chimique", label: "Chimique", icon: Beaker },
  { value: "document", label: "Document", icon: FileText },
  { value: "autre", label: "Autre", icon: Package },
];

export default function BoutiquePage() {
  const [produits, setProduits] = useState<Produit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 1000]);
  const [priceMax, setPriceMax] = useState(1000);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);
  const hasInitializedPriceRange = useRef(false);

  useEffect(() => {
    let active = true;

    const fetchProducts = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch("/api/produits?limit=200&page=1", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les produits.");
        }

        const payload = (await response.json()) as ProductsResponse | Produit[];
        const rows = Array.isArray(payload) ? payload : (payload.data ?? []);
        const safeRows = Array.isArray(rows) ? rows : [];

        if (!active) return;
        setProduits(safeRows);

        const maxPrice = Math.max(
          100,
          ...safeRows.map((item) => Number(item.price || 0)),
        );
        const normalizedMax = Math.ceil(maxPrice / 10) * 10;
        setPriceMax(normalizedMax);

        if (!hasInitializedPriceRange.current) {
          hasInitializedPriceRange.current = true;
          setPriceRange([0, normalizedMax]);
        } else {
          setPriceRange((previous) => [
            Math.min(previous[0], normalizedMax),
            Math.min(previous[1], normalizedMax),
          ]);
        }
      } catch {
        if (!active) return;
        setProduits([]);
        setFetchError("Impossible de recuperer les produits pour le moment.");
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchProducts();

    return () => {
      active = false;
    };
  }, []);

  const filteredProduits = useMemo(() => {
    return produits.filter((produit) => {
      const normalizedSearch = searchQuery.toLowerCase();
      const matchesSearch =
        produit.name.toLowerCase().includes(normalizedSearch) ||
        produit.description?.toLowerCase().includes(normalizedSearch);
      const matchesType = selectedType === "all" || produit.type === selectedType;
      const matchesPrice =
        Number(produit.price || 0) >= priceRange[0] &&
        Number(produit.price || 0) <= priceRange[1];
      const matchesAvailability =
        !showOnlyAvailable || produit.stock === null || produit.stock > 0;

      return matchesSearch && matchesType && matchesPrice && matchesAvailability;
    });
  }, [produits, searchQuery, selectedType, priceRange, showOnlyAvailable]);

  const hasActiveFilters =
    selectedType !== "all" ||
    priceRange[0] > 0 ||
    priceRange[1] < priceMax ||
    showOnlyAvailable;

  const clearFilters = () => {
    setSelectedType("all");
    setPriceRange([0, priceMax]);
    setShowOnlyAvailable(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium uppercase tracking-wider text-sm">
                Catalogue
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl lg:text-5xl font-semibold text-slate-900">
              Notre boutique
            </h1>
            <p className="text-slate-600 mt-3 max-w-2xl text-lg">
              Produits chimiques certifies, documents techniques et equipements
              professionnels.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un produit..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {productTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedType === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedType(type.value)}
                className="whitespace-nowrap"
              >
                <type.icon className="h-4 w-4 mr-2" />
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Prix</h3>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={priceMax}
                  step={10}
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-slate-600">
                  <span>${priceRange[0]}</span>
                  <span>${priceRange[1]}</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">
                  Disponibilite
                </h3>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={showOnlyAvailable}
                    onChange={(e) => setShowOnlyAvailable(e.target.checked)}
                    className="rounded border-slate-300"
                  />
                  <span className="text-sm text-slate-600">
                    En stock uniquement
                  </span>
                </label>
              </div>

              {hasActiveFilters && (
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={clearFilters}
                >
                  <X className="h-4 w-4 mr-2" />
                  Effacer les filtres
                </Button>
              )}
            </div>
          </div>

          <div className="flex-1">
            {isLoading ? (
              <p className="text-sm text-slate-500 mb-4">Chargement des produits...</p>
            ) : (
              <p className="text-sm text-slate-500 mb-4">
                {filteredProduits.length} produit
                {filteredProduits.length !== 1 ? "s" : ""} trouve
                {filteredProduits.length !== 1 ? "s" : ""}
              </p>
            )}

            {fetchError ? (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-medium text-slate-900 mb-2">
                  Erreur de chargement
                </h3>
                <p className="text-slate-500 mb-4">{fetchError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reessayer
                </Button>
              </div>
            ) : isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {Array.from({ length: 6 }).map((_, index) => (
                  <div
                    key={`skeleton-${index}`}
                    className="h-[430px] rounded-xl border border-slate-200 bg-white animate-pulse"
                  />
                ))}
              </div>
            ) : filteredProduits.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredProduits.map((produit, index) => (
                  <ProductCard
                    key={produit.id}
                    produit={produit}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-medium text-slate-900 mb-2">
                  Aucun produit trouve
                </h3>
                <p className="text-slate-500">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={clearFilters}
                  >
                    Effacer les filtres
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
