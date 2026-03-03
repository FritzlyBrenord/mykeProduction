"use client";

import FormationCard from "@/components/cards/FormationCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
import { useAuth } from "@/lib/hooks/useAuth";
import { Formation } from "@/lib/types";
import { motion } from "framer-motion";
import { Filter, Search, Sparkles, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const levels = ["Tous", "Debutant", "Intermediaire", "Avance"] as const;
const formats = ["Tous", "Video", "Texte"] as const;
const prices = ["Tous", "Gratuit", "Payant"] as const;
const sortOptions = [
  { value: "recent", label: "Plus recentes" },
  { value: "popular", label: "Plus populaires" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix decroissant" },
] as const;

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

export default function FormationsPage() {
  const { user, loading: authLoading } = useAuth();
  const [formations, setFormations] = useState<Formation[]>([]);
  const [purchasedFormationIds, setPurchasedFormationIds] = useState<string[]>(
    [],
  );
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");
  const [selectedLevel, setSelectedLevel] = useState("Tous");
  const [selectedFormat, setSelectedFormat] = useState("Tous");
  const [selectedPrice, setSelectedPrice] = useState("Tous");
  const [selectedSort, setSelectedSort] = useState<(typeof sortOptions)[number]["value"]>("recent");

  useEffect(() => {
    let active = true;

    const fetchPublicFormations = async () => {
      try {
        setIsLoading(true);
        setFetchError(null);

        const response = await fetch("/api/formations?limit=200", {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les formations publiees.");
        }

        const data = (await response.json()) as Formation[];
        if (!active) return;
        setFormations(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setFetchError("Impossible de recuperer les formations pour le moment.");
        setFormations([]);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchPublicFormations();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    let active = true;

    const fetchPurchasedFormations = async () => {
      if (authLoading) return;

      if (!user) {
        setPurchasedFormationIds([]);
        return;
      }

      try {
        const response = await fetch("/api/compte/formations", {
          method: "GET",
          cache: "no-store",
        });

        if (!active) return;

        if (!response.ok) {
          setPurchasedFormationIds([]);
          return;
        }

        const accountData = (await response.json()) as {
          enrollments?: Array<{ formation_id: string | null }>;
        };

        const ids = (accountData.enrollments ?? [])
          .map((entry) => entry.formation_id)
          .filter((id): id is string => Boolean(id));
        setPurchasedFormationIds(ids);
      } catch {
        if (!active) return;
        setPurchasedFormationIds([]);
      }
    };

    fetchPurchasedFormations();

    return () => {
      active = false;
    };
  }, [user, authLoading]);

  const categories = useMemo(() => {
    const names = formations
      .map((formation) => formation.category?.name ?? null)
      .filter((name): name is string => Boolean(name));

    const unique = Array.from(new Set(names)).sort((a, b) => a.localeCompare(b));
    return ["Toutes", ...unique];
  }, [formations]);

  const purchasedSet = useMemo(
    () => new Set(purchasedFormationIds),
    [purchasedFormationIds],
  );

  const filteredFormations = useMemo(() => {
    const search = normalizeText(searchQuery.trim());
    const filtered = formations.filter((formation) => {
      const title = normalizeText(formation.title);
      const description = normalizeText(formation.description);
      const categoryName = formation.category?.name ?? "Toutes";

      const matchesSearch = !search || title.includes(search) || description.includes(search);
      const matchesCategory =
        selectedCategory === "Toutes" || categoryName === selectedCategory;
      const matchesLevel =
        selectedLevel === "Tous" ||
        (selectedLevel === "Debutant" && formation.level === "debutant") ||
        (selectedLevel === "Intermediaire" && formation.level === "intermediaire") ||
        (selectedLevel === "Avance" && formation.level === "avance");
      const matchesFormat =
        selectedFormat === "Tous" ||
        (selectedFormat === "Video" && formation.format === "video") ||
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

    const sorted = [...filtered];
    sorted.sort((a, b) => {
      if (selectedSort === "popular") {
        return (b.enrolled_count ?? 0) - (a.enrolled_count ?? 0);
      }

      if (selectedSort === "price-asc") {
        return Number(a.price ?? 0) - Number(b.price ?? 0);
      }

      if (selectedSort === "price-desc") {
        return Number(b.price ?? 0) - Number(a.price ?? 0);
      }

      return (
        new Date(b.created_at ?? 0).getTime() - new Date(a.created_at ?? 0).getTime()
      );
    });

    return sorted;
  }, [
    formations,
    searchQuery,
    selectedCategory,
    selectedLevel,
    selectedFormat,
    selectedPrice,
    selectedSort,
  ]);

  const hasActiveFilters =
    selectedCategory !== "Toutes" ||
    selectedLevel !== "Tous" ||
    selectedFormat !== "Tous" ||
    selectedPrice !== "Tous" ||
    searchQuery.trim().length > 0;

  const clearFilters = () => {
    setSelectedCategory("Toutes");
    setSelectedLevel("Tous");
    setSelectedFormat("Tous");
    setSelectedPrice("Tous");
    setSelectedSort("recent");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex items-center gap-2 text-amber-600 mb-2">
              <Sparkles className="h-5 w-5" />
              <span className="font-medium uppercase tracking-wider text-sm">Catalogue</span>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl lg:text-5xl font-semibold text-slate-900">
              Nos formations
            </h1>
            <p className="text-slate-600 mt-3 max-w-2xl text-lg">
              Retrouvez uniquement les formations publiees et accessibles au public.
            </p>
          </motion.div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une formation..."
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              className="pl-10 border border-slate-300 text-slate-900"
            />
          </div>

          <div className="w-full sm:w-60">
            <Select value={selectedSort} onValueChange={(value) => setSelectedSort(value as typeof selectedSort)}>
              <SelectTrigger>
                <SelectValue placeholder="Trier par" />
              </SelectTrigger>
              <SelectContent>
                {sortOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                  <label className="text-sm font-medium mb-2 block">Categorie</label>
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
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
                  <label className="text-sm font-medium mb-2 block">Niveau</label>
                  <Select value={selectedLevel} onValueChange={setSelectedLevel}>
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
                  <label className="text-sm font-medium mb-2 block">Format</label>
                  <Select value={selectedFormat} onValueChange={setSelectedFormat}>
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
                  <Select value={selectedPrice} onValueChange={setSelectedPrice}>
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
          <div className="hidden lg:block w-64 flex-shrink-0">
            <div className="bg-white rounded-lg shadow-sm border p-6 space-y-6">
              <div>
                <h3 className="font-semibold text-slate-900 mb-3">Categorie</h3>
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

          <div className="flex-1">
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
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedLevel("Tous")} />
                  </Badge>
                )}
                {selectedFormat !== "Tous" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedFormat}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedFormat("Tous")} />
                  </Badge>
                )}
                {selectedPrice !== "Tous" && (
                  <Badge variant="secondary" className="gap-1">
                    {selectedPrice}
                    <X className="h-3 w-3 cursor-pointer" onClick={() => setSelectedPrice("Tous")} />
                  </Badge>
                )}
                <button onClick={clearFilters} className="text-sm text-amber-600 hover:text-amber-700">
                  Tout effacer
                </button>
              </div>
            )}

            {isLoading ? (
              <div className="text-center py-16 text-slate-500">Chargement des formations...</div>
            ) : fetchError ? (
              <div className="text-center py-16">
                <h3 className="font-semibold text-slate-900 mb-2">Erreur de chargement</h3>
                <p className="text-slate-500 mb-4">{fetchError}</p>
                <Button variant="outline" onClick={() => window.location.reload()}>
                  Reessayer
                </Button>
              </div>
            ) : (
              <>
                <p className="text-sm text-slate-500 mb-4">
                  {filteredFormations.length} formation
                  {filteredFormations.length !== 1 ? "s" : ""} trouvee
                  {filteredFormations.length !== 1 ? "s" : ""}
                </p>

                {filteredFormations.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    {filteredFormations.map((formation, index) => (
                      <FormationCard
                        key={formation.id}
                        formation={formation}
                        index={index}
                        isPurchased={
                          formation.is_free || purchasedSet.has(formation.id)
                        }
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <h3 className="font-[family-name:var(--font-playfair)] text-lg font-medium text-slate-900 mb-2">
                      Aucune formation trouvee
                    </h3>
                    <p className="text-slate-500">Essayez de modifier vos filtres ou votre recherche.</p>
                    <Button variant="outline" className="mt-4" onClick={clearFilters}>
                      Effacer les filtres
                    </Button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
