"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Sparkles, X } from "lucide-react";
import { Formation } from "@/lib/types";
import FormationCard from "@/components/cards/FormationCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Données mockées
const mockFormations: Formation[] = [
  {
    id: "1",
    title: "Introduction à la chimie industrielle",
    slug: "introduction-chimie-industrielle",
    description:
      "Apprenez les bases de la chimie industrielle, des réactions chimiques aux procédés de fabrication.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
    price: 199,
    is_free: false,
    format: "video",
    status: "published",
    category_id: "1",
    duration_hours: 12,
    level: "debutant",
    language: "fr",
    certificate: true,
    enrolled_count: 245,
    rating_avg: 4.7,
    created_at: "2024-01-15",
    updated_at: "2024-01-15",
    category: { id: "1", name: "Chimie", slug: "chimie", type: "formation" },
  },
  {
    id: "2",
    title: "Sécurité des procédés industriels",
    slug: "securite-procedes-industriels",
    description:
      "Maîtrisez les normes de sécurité et les bonnes pratiques pour les environnements industriels.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1581092921461-eab62e97a782?w=800",
    price: 0,
    is_free: true,
    format: "text",
    status: "published",
    category_id: "2",
    duration_hours: 8,
    level: "intermediaire",
    language: "fr",
    certificate: true,
    enrolled_count: 512,
    rating_avg: 4.5,
    created_at: "2024-02-01",
    updated_at: "2024-02-01",
    category: {
      id: "2",
      name: "Sécurité",
      slug: "securite",
      type: "formation",
    },
  },
  {
    id: "3",
    title: "Gestion de la qualité ISO 9001",
    slug: "gestion-qualite-iso-9001",
    description:
      "Implémentez un système de management de la qualité conforme à la norme ISO 9001.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
    price: 299,
    is_free: false,
    format: "video",
    status: "published",
    category_id: "3",
    duration_hours: 20,
    level: "avance",
    language: "fr",
    certificate: true,
    enrolled_count: 189,
    rating_avg: 4.8,
    created_at: "2024-01-20",
    updated_at: "2024-01-20",
    category: { id: "3", name: "Qualité", slug: "qualite", type: "formation" },
  },
  {
    id: "4",
    title: "Automatisation industrielle avec PLC",
    slug: "automatisation-plc",
    description:
      "Programmation et configuration des automates programmables industriels.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1565514020176-db9e1b95da24?w=800",
    price: 349,
    is_free: false,
    format: "video",
    status: "published",
    category_id: "4",
    duration_hours: 25,
    level: "intermediaire",
    language: "fr",
    certificate: true,
    enrolled_count: 156,
    rating_avg: 4.9,
    created_at: "2024-02-10",
    updated_at: "2024-02-10",
    category: {
      id: "4",
      name: "Automatisation",
      slug: "automatisation",
      type: "formation",
    },
  },
  {
    id: "5",
    title: "Hydrolyse acide : principes et applications",
    slug: "hydrolyse-acide",
    description:
      "Comprendre les mécanismes d'hydrolyse acide et leurs applications industrielles.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800",
    price: 149,
    is_free: false,
    format: "text",
    status: "published",
    category_id: "1",
    duration_hours: 6,
    level: "avance",
    language: "fr",
    certificate: false,
    enrolled_count: 89,
    rating_avg: 4.6,
    created_at: "2024-02-15",
    updated_at: "2024-02-15",
    category: { id: "1", name: "Chimie", slug: "chimie", type: "formation" },
  },
  {
    id: "6",
    title: "Maintenance préventive des équipements",
    slug: "maintenance-preventive",
    description:
      "Optimisez la disponibilité de vos équipements grâce à une maintenance préventive efficace.",
    thumbnail_url:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    price: 0,
    is_free: true,
    format: "video",
    status: "published",
    category_id: "5",
    duration_hours: 10,
    level: "debutant",
    language: "fr",
    certificate: true,
    enrolled_count: 423,
    rating_avg: 4.4,
    created_at: "2024-01-25",
    updated_at: "2024-01-25",
    category: {
      id: "5",
      name: "Maintenance",
      slug: "maintenance",
      type: "formation",
    },
  },
];

const categories = [
  "Toutes",
  "Chimie",
  "Sécurité",
  "Qualité",
  "Automatisation",
  "Maintenance",
];
const levels = ["Tous", "Débutant", "Intermédiaire", "Avancé"];
const formats = ["Tous", "Vidéo", "Texte"];
const prices = ["Tous", "Gratuit", "Payant"];

export default function FormationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [selectedLevel, setSelectedLevel] = useState("Tous");
  const [selectedFormat, setSelectedFormat] = useState("Tous");
  const [selectedPrice, setSelectedPrice] = useState("Tous");

  const filteredFormations = mockFormations.filter((formation) => {
    const matchesSearch =
      formation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      formation.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Toutes" ||
      formation.category?.name === selectedCategory;
    const matchesLevel =
      selectedLevel === "Tous" ||
      (selectedLevel === "Débutant" && formation.level === "debutant") ||
      (selectedLevel === "Intermédiaire" &&
        formation.level === "intermediaire") ||
      (selectedLevel === "Avancé" && formation.level === "avance");
    const matchesFormat =
      selectedFormat === "Tous" ||
      (selectedFormat === "Vidéo" && formation.format === "video") ||
      (selectedFormat === "Texte" && formation.format === "text");
    const matchesPrice =
      selectedPrice === "Tous" ||
      (selectedPrice === "Gratuit" && formation.is_free) ||
      (selectedPrice === "Payant" && !formation.is_free);

    return (
      matchesSearch &&
      matchesCategory &&
      matchesLevel &&
      matchesFormat &&
      matchesPrice
    );
  });

  const hasActiveFilters =
    selectedCategory !== "Toutes" ||
    selectedLevel !== "Tous" ||
    selectedFormat !== "Tous" ||
    selectedPrice !== "Tous";

  const clearFilters = () => {
    setSelectedCategory("Toutes");
    setSelectedLevel("Tous");
    setSelectedFormat("Tous");
    setSelectedPrice("Tous");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
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
              Nos formations
            </h1>
            <p className="text-slate-600 mt-3 max-w-2xl text-lg">
              Découvrez notre catalogue de formations professionnelles pour
              développer vos compétences industrielles.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Mobile Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une formation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border border-slate-300 text-slate-900"
            />
          </div>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="sm:hidden">
                <Filter className="h-4 w-4 mr-2" />
                Filtres
              </Button>
            </SheetTrigger>
            <SheetContent side="right">
              <SheetHeader>
                <SheetTitle>Filtres</SheetTitle>
              </SheetHeader>
              <div className="space-y-4 mt-4">
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Catégorie
                  </label>
                  <Select
                    value={selectedCategory}
                    onValueChange={setSelectedCategory}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat} value={cat}>
                          {cat}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Niveau
                  </label>
                  <Select
                    value={selectedLevel}
                    onValueChange={setSelectedLevel}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {levels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {level}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">
                    Format
                  </label>
                  <Select
                    value={selectedFormat}
                    onValueChange={setSelectedFormat}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {formats.map((format) => (
                        <SelectItem key={format} value={format}>
                          {format}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium mb-2 block">Prix</label>
                  <Select
                    value={selectedPrice}
                    onValueChange={setSelectedPrice}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {prices.map((price) => (
                        <SelectItem key={price} value={price}>
                          {price}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Desktop Sidebar Filters */}
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Catégorie</h3>
                <div className="space-y-2">
                  {categories.map((cat) => (
                    <button
                      key={cat}
                      onClick={() => setSelectedCategory(cat)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedCategory === cat
                          ? "bg-amber-50 text-amber-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Niveau</h3>
                <div className="space-y-2">
                  {levels.map((level) => (
                    <button
                      key={level}
                      onClick={() => setSelectedLevel(level)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedLevel === level
                          ? "bg-amber-50 text-amber-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Format</h3>
                <div className="space-y-2">
                  {formats.map((format) => (
                    <button
                      key={format}
                      onClick={() => setSelectedFormat(format)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedFormat === format
                          ? "bg-amber-50 text-amber-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {format}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Prix</h3>
                <div className="space-y-2">
                  {prices.map((price) => (
                    <button
                      key={price}
                      onClick={() => setSelectedPrice(price)}
                      className={`block w-full text-left px-3 py-2 rounded-md text-sm transition-colors ${
                        selectedPrice === price
                          ? "bg-amber-50 text-amber-600"
                          : "text-slate-600 hover:bg-slate-50"
                      }`}
                    >
                      {price}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Results */}
          <div className="flex-1">
            {/* Active Filters */}
            {hasActiveFilters && (
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <span className="text-sm text-slate-500">Filtres actifs:</span>
                {selectedCategory !== "Toutes" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedCategory}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSelectedCategory("Toutes")}
                    />
                  </Badge>
                )}
                {selectedLevel !== "Tous" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedLevel}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSelectedLevel("Tous")}
                    />
                  </Badge>
                )}
                {selectedFormat !== "Tous" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedFormat}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSelectedFormat("Tous")}
                    />
                  </Badge>
                )}
                {selectedPrice !== "Tous" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedPrice}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => setSelectedPrice("Tous")}
                    />
                  </Badge>
                )}
                <button
                  onClick={clearFilters}
                  className="text-sm text-amber-600 hover:text-amber-700"
                >
                  Tout effacer
                </button>
              </div>
            )}

            {/* Results Count */}
            <p className="text-sm text-slate-500 mb-4">
              {filteredFormations.length} formation
              {filteredFormations.length !== 1 ? "s" : ""} trouvée
              {filteredFormations.length !== 1 ? "s" : ""}
            </p>

            {/* Grid */}
            {filteredFormations.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {filteredFormations.map((formation, index) => (
                  <FormationCard
                    key={formation.id}
                    formation={formation}
                    index={index}
                  />
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                <h3 className="font-[family-name:var(--font-playfair)] text-lg font-medium text-slate-900 mb-2">
                  Aucune formation trouvée
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
