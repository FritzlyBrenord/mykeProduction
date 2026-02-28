"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  Sparkles,
  X,
  Beaker,
  FileText,
  Package,
  ShoppingBag,
} from "lucide-react";
import { Produit } from "@/lib/types";
import ProductCard from "@/components/cards/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mockProduits: Produit[] = [
  {
    id: "1",
    name: "Acide sulfurique 98% - 1L",
    slug: "acide-sulfurique-98-1l",
    description:
      "Acide sulfurique concentré de haute pureté pour applications industrielles et laboratoire.",
    price: 45.9,
    images: [
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800",
    ],
    type: "chimique",
    stock: 50,
    is_digital: false,
    cas_number: "7664-93-9",
    purity: "98%",
    unit: "L",
    min_order: 1,
    ghs_pictograms: ["GHS05", "GHS07"],
    hazard_statements: ["H314", "H290"],
    precautionary_statements: ["P280", "P305+P351+P338"],
    signal_word: "Danger",
    age_restricted: true,
    restricted_sale: false,
    status: "published",
    featured: true,
    created_at: "2024-01-10",
    updated_at: "2024-01-10",
  },
  {
    id: "2",
    name: "Guide complet HACCP",
    slug: "guide-complet-haccp",
    description:
      "Guide PDF complet pour la mise en place d'un plan HACCP dans votre entreprise.",
    price: 29.9,
    images: [
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
    ],
    type: "document",
    stock: null,
    is_digital: true,
    file_url: "/documents/guide-haccp.pdf",
    min_order: 1,
    ghs_pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: null,
    age_restricted: false,
    restricted_sale: false,
    status: "published",
    featured: true,
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
  },
  {
    id: "3",
    name: "Hydroxyde de sodium - 500g",
    slug: "hydroxyde-sodium-500g",
    description:
      "Soude caustique pure pour applications chimiques et industrielles.",
    price: 18.5,
    images: [
      "https://images.unsplash.com/photo-1608037521244-f1c6c7635194?w=800",
    ],
    type: "chimique",
    stock: 100,
    is_digital: false,
    cas_number: "1310-73-2",
    purity: "99%",
    unit: "g",
    min_order: 1,
    ghs_pictograms: ["GHS05", "GHS07"],
    hazard_statements: ["H314", "H290"],
    precautionary_statements: ["P280", "P305+P351+P338"],
    signal_word: "Danger",
    age_restricted: true,
    restricted_sale: false,
    status: "published",
    featured: false,
    created_at: "2024-01-20",
    updated_at: "2024-01-20",
  },
  {
    id: "4",
    name: "Équipement de protection individuelle - Kit complet",
    slug: "epi-kit-complet",
    description:
      "Kit complet d'EPI comprenant lunettes, gants, masque et blouse de laboratoire.",
    price: 89.9,
    images: [
      "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=800",
    ],
    type: "autre",
    stock: 25,
    is_digital: false,
    min_order: 1,
    ghs_pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: null,
    age_restricted: false,
    restricted_sale: false,
    status: "published",
    featured: true,
    created_at: "2024-02-01",
    updated_at: "2024-02-01",
  },
  {
    id: "5",
    name: "Méthanol pur - 2L",
    slug: "methanol-pur-2l",
    description:
      "Méthanol de grade analytique pour applications de laboratoire.",
    price: 35.0,
    images: [
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800",
    ],
    type: "chimique",
    stock: 30,
    is_digital: false,
    cas_number: "67-56-1",
    purity: "99.9%",
    unit: "L",
    min_order: 1,
    ghs_pictograms: ["GHS02", "GHS06", "GHS08"],
    hazard_statements: ["H301", "H311", "H331", "H370"],
    precautionary_statements: ["P210", "P280", "P301+P310"],
    signal_word: "Danger",
    age_restricted: true,
    restricted_sale: true,
    status: "published",
    featured: false,
    created_at: "2024-02-05",
    updated_at: "2024-02-05",
  },
  {
    id: "6",
    name: "Manuel de sécurité industrielle",
    slug: "manuel-securite-industrielle",
    description:
      "Manuel complet des procédures de sécurité en environnement industriel.",
    price: 49.9,
    images: [
      "https://images.unsplash.com/photo-1586281380349-632531db7ed4?w=800",
    ],
    type: "document",
    stock: null,
    is_digital: true,
    min_order: 1,
    ghs_pictograms: [],
    hazard_statements: [],
    precautionary_statements: [],
    signal_word: null,
    age_restricted: false,
    restricted_sale: false,
    status: "published",
    featured: false,
    created_at: "2024-02-10",
    updated_at: "2024-02-10",
  },
];

const productTypes = [
  { value: "all", label: "Tous", icon: ShoppingBag },
  { value: "chimique", label: "Chimique", icon: Beaker },
  { value: "document", label: "Document", icon: FileText },
  { value: "autre", label: "Autre", icon: Package },
];

export default function BoutiquePage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [priceRange, setPriceRange] = useState([0, 500]);
  const [showOnlyAvailable, setShowOnlyAvailable] = useState(false);

  const filteredProduits = mockProduits.filter((produit) => {
    const matchesSearch =
      produit.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      produit.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = selectedType === "all" || produit.type === selectedType;
    const matchesPrice =
      produit.price >= priceRange[0] && produit.price <= priceRange[1];
    const matchesAvailability =
      !showOnlyAvailable || produit.stock === null || produit.stock > 0;

    return matchesSearch && matchesType && matchesPrice && matchesAvailability;
  });

  const hasActiveFilters =
    selectedType !== "all" ||
    priceRange[0] > 0 ||
    priceRange[1] < 500 ||
    showOnlyAvailable;

  const clearFilters = () => {
    setSelectedType("all");
    setPriceRange([0, 500]);
    setShowOnlyAvailable(false);
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
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
              Produits chimiques certifiés, documents techniques et équipements
              professionnels.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Type Filter */}
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
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-4">Prix</h3>
                <Slider
                  value={priceRange}
                  onValueChange={setPriceRange}
                  max={500}
                  step={10}
                  className="mb-4"
                />
                <div className="flex justify-between text-sm text-slate-600">
                  <span>{priceRange[0]}€</span>
                  <span>{priceRange[1]}€</span>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-4">
                  Disponibilité
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

          {/* Results */}
          <div className="flex-1">
            {/* Results Count */}
            <p className="text-sm text-slate-500 mb-4">
              {filteredProduits.length} produit
              {filteredProduits.length !== 1 ? "s" : ""} trouvé
              {filteredProduits.length !== 1 ? "s" : ""}
            </p>

            {/* Grid */}
            {filteredProduits.length > 0 ? (
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
                  Aucun produit trouvé
                </h3>
                <p className="text-slate-500">
                  Essayez de modifier vos filtres ou votre recherche
                </p>
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={clearFilters}
                >
                  Effacer les filtres
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
