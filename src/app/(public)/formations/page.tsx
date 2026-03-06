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
import { motion, AnimatePresence } from "framer-motion";
import {
  Filter,
  Search,
  Sparkles,
  X,
  Check,
  SlidersHorizontal,
  GraduationCap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

const levels = ["Tous", "Debutant", "Intermediaire", "Avance"] as const;
const formats = ["Tous", "Video", "Texte"] as const;
const prices = ["Tous", "Gratuit", "Payant"] as const;
const sortOptions = [
  { value: "recent", label: "Plus récentes" },
  { value: "popular", label: "Plus populaires" },
  { value: "price-asc", label: "Prix croissant" },
  { value: "price-desc", label: "Prix décroissant" },
] as const;

type LevelValue = (typeof levels)[number];
type FormatValue = (typeof formats)[number];
type PriceValue = (typeof prices)[number];

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
}

// ─── Reusable filter button ───────────────────────────────────────────────────
function FilterButton({
  label,
  isActive,
  onClick,
}: {
  label: string;
  isActive: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`
        flex w-full items-center justify-between rounded-lg px-3 py-2.5
        text-sm font-medium transition-all duration-200
        ${
          isActive
            ? "bg-amber-500 text-white shadow-sm shadow-amber-200"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
        }
      `}
    >
      <span>{label}</span>
      {isActive && <Check className="h-3.5 w-3.5 shrink-0" />}
    </button>
  );
}

// ─── Filter section in sidebar ────────────────────────────────────────────────
function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        {title}
      </h3>
      <div className="space-y-1">{children}</div>
    </div>
  );
}

// ─── Skeleton loader ──────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
      <div className="aspect-video animate-pulse bg-slate-200" />
      <div className="space-y-3 p-5">
        <div className="h-3 w-1/3 animate-pulse rounded bg-slate-200" />
        <div className="h-5 w-3/4 animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-full animate-pulse rounded bg-slate-200" />
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-200" />
        <div className="mt-4 h-10 animate-pulse rounded-lg bg-slate-200" />
      </div>
    </div>
  );
}

// ─── Main page ─────────────────────────────────────────────────────────────────
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
  const [selectedLevel, setSelectedLevel] = useState<LevelValue>("Tous");
  const [selectedFormat, setSelectedFormat] = useState<FormatValue>("Tous");
  const [selectedPrice, setSelectedPrice] = useState<PriceValue>("Tous");
  const [selectedSort, setSelectedSort] =
    useState<(typeof sortOptions)[number]["value"]>("recent");

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
        if (!response.ok)
          throw new Error("Impossible de charger les formations publiées.");
        const data = (await response.json()) as Formation[];
        if (!active) return;
        setFormations(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setFetchError("Impossible de récupérer les formations pour le moment.");
        setFormations([]);
      } finally {
        if (active) setIsLoading(false);
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
      .map((f) => f.category?.name ?? null)
      .filter((n): n is string => Boolean(n));
    const unique = Array.from(new Set(names)).sort((a, b) =>
      a.localeCompare(b),
    );
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

      const matchesSearch =
        !search || title.includes(search) || description.includes(search);
      const matchesCategory =
        selectedCategory === "Toutes" || categoryName === selectedCategory;
      const matchesLevel =
        selectedLevel === "Tous" ||
        (selectedLevel === "Debutant" && formation.level === "debutant") ||
        (selectedLevel === "Intermediaire" &&
          formation.level === "intermediaire") ||
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
      if (selectedSort === "popular")
        return (b.enrolled_count ?? 0) - (a.enrolled_count ?? 0);
      if (selectedSort === "price-asc")
        return Number(a.price ?? 0) - Number(b.price ?? 0);
      if (selectedSort === "price-desc")
        return Number(b.price ?? 0) - Number(a.price ?? 0);
      return (
        new Date(b.created_at ?? 0).getTime() -
        new Date(a.created_at ?? 0).getTime()
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

  // Active filter badge count for mobile button
  const activeFilterCount = [
    selectedCategory !== "Toutes",
    selectedLevel !== "Tous",
    selectedFormat !== "Tous",
    selectedPrice !== "Tous",
  ].filter(Boolean).length;

  // ─── Sidebar filter content (shared between desktop + Sheet) ────────────────
  const SidebarFilters = () => (
    <div className="space-y-6">
      <FilterSection title="Catégorie">
        {categories.map((cat) => (
          <FilterButton
            key={cat}
            label={cat}
            isActive={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
          />
        ))}
      </FilterSection>

      <div className="h-px bg-slate-100" />

      <FilterSection title="Niveau">
        {levels.map((level) => (
          <FilterButton
            key={level}
            label={level}
            isActive={selectedLevel === level}
            onClick={() => setSelectedLevel(level)}
          />
        ))}
      </FilterSection>

      <div className="h-px bg-slate-100" />

      <FilterSection title="Format">
        {formats.map((format) => (
          <FilterButton
            key={format}
            label={format}
            isActive={selectedFormat === format}
            onClick={() => setSelectedFormat(format)}
          />
        ))}
      </FilterSection>

      <div className="h-px bg-slate-100" />

      <FilterSection title="Prix">
        {prices.map((price) => (
          <FilterButton
            key={price}
            label={price}
            isActive={selectedPrice === price}
            onClick={() => setSelectedPrice(price)}
          />
        ))}
      </FilterSection>

      {hasActiveFilters && (
        <>
          <div className="h-px bg-slate-100" />
          <button
            onClick={clearFilters}
            className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition-colors hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600"
          >
            <X className="h-3.5 w-3.5" />
            Réinitialiser les filtres
          </button>
        </>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* ── Hero header ────────────────────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="flex items-center gap-2 text-amber-600 mb-3">
              <Sparkles className="h-4 w-4" />
              <span className="text-xs font-semibold uppercase tracking-widest">
                Catalogue
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl lg:text-5xl font-bold text-slate-900 mb-4">
              Nos formations
            </h1>
            <p className="text-slate-500 max-w-2xl text-lg leading-relaxed">
              Retrouvez l&apos;ensemble des formations publiées et accessibles
              au public.
            </p>
          </motion.div>
        </div>
      </div>

      {/* ── Search + Sort bar ──────────────────────────────────────────────── */}
      <div className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex gap-3 items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Rechercher une formation..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-slate-50 border-slate-200 text-slate-900 placeholder:text-slate-400 focus-visible:ring-amber-500 h-10"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* Sort */}
            <div className="hidden sm:block w-52">
              <Select
                value={selectedSort}
                onValueChange={(value) =>
                  setSelectedSort(value as typeof selectedSort)
                }
              >
                <SelectTrigger className="h-10 bg-white border border-slate-300 text-slate-800 font-medium shadow-sm hover:border-amber-400 focus:ring-amber-400 focus:border-amber-400 transition-colors">
                  <SelectValue placeholder="Trier par" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700">
                  {sortOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Mobile filter Sheet */}
            <Sheet>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  className="lg:hidden h-10 relative border-slate-200 text-slate-700"
                >
                  <SlidersHorizontal className="h-4 w-4 mr-2" />
                  Filtres
                  {activeFilterCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-[10px] font-bold text-white">
                      {activeFilterCount}
                    </span>
                  )}
                </Button>
              </SheetTrigger>
              <SheetContent
                side="right"
                className="w-80 overflow-y-auto bg-white"
              >
                <SheetHeader className="mb-6">
                  <SheetTitle className="flex items-center gap-2 text-slate-900">
                    <Filter className="h-4 w-4 text-amber-500" />
                    Filtres
                  </SheetTitle>
                </SheetHeader>

                {/* Sort inside sheet on mobile */}
                <div className="mb-6 sm:hidden">
                  <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Trier par
                  </h3>
                  <Select
                    value={selectedSort}
                    onValueChange={(v) =>
                      setSelectedSort(v as typeof selectedSort)
                    }
                  >
                    <SelectTrigger className="w-full bg-white border border-slate-300 text-slate-800 font-medium shadow-sm hover:border-amber-400 focus:ring-amber-400">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sortOptions.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <SidebarFilters />
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </div>

      {/* ── Main content ───────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* ── Desktop sidebar ──────────────────────────────────────────── */}
          <aside className="hidden lg:block w-64 flex-shrink-0">
            <div className="sticky top-[73px] rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2">
                <Filter className="h-4 w-4 text-amber-500" />
                <span className="font-semibold text-slate-800 text-sm">
                  Filtres
                </span>
                {activeFilterCount > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-amber-100 text-[11px] font-bold text-amber-700">
                    {activeFilterCount}
                  </span>
                )}
              </div>
              <SidebarFilters />
            </div>
          </aside>

          {/* ── Results area ─────────────────────────────────────────────── */}
          <div className="flex-1 min-w-0">
            {/* Active filter badges */}
            <AnimatePresence>
              {hasActiveFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mb-4"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                      Filtres actifs :
                    </span>
                    {selectedCategory !== "Toutes" && (
                      <Badge
                        className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer border-0 pr-1.5"
                        onClick={() => setSelectedCategory("Toutes")}
                      >
                        {selectedCategory}
                        <X className="h-3 w-3" />
                      </Badge>
                    )}
                    {selectedLevel !== "Tous" && (
                      <Badge
                        className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer border-0 pr-1.5"
                        onClick={() => setSelectedLevel("Tous")}
                      >
                        {selectedLevel}
                        <X className="h-3 w-3" />
                      </Badge>
                    )}
                    {selectedFormat !== "Tous" && (
                      <Badge
                        className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer border-0 pr-1.5"
                        onClick={() => setSelectedFormat("Tous")}
                      >
                        {selectedFormat}
                        <X className="h-3 w-3" />
                      </Badge>
                    )}
                    {selectedPrice !== "Tous" && (
                      <Badge
                        className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer border-0 pr-1.5"
                        onClick={() => setSelectedPrice("Tous")}
                      >
                        {selectedPrice}
                        <X className="h-3 w-3" />
                      </Badge>
                    )}
                    {searchQuery.trim() && (
                      <Badge
                        className="gap-1 bg-slate-100 text-slate-700 hover:bg-slate-200 cursor-pointer border-0 pr-1.5"
                        onClick={() => setSearchQuery("")}
                      >
                        &ldquo;{searchQuery.trim()}&rdquo;
                        <X className="h-3 w-3" />
                      </Badge>
                    )}
                    <button
                      onClick={clearFilters}
                      className="text-xs text-rose-500 hover:text-rose-700 font-medium underline underline-offset-2"
                    >
                      Tout effacer
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Loading state */}
            {isLoading ? (
              <div>
                <div className="mb-4 h-4 w-32 animate-pulse rounded bg-slate-200" />
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <SkeletonCard key={i} />
                  ))}
                </div>
              </div>
            ) : fetchError ? (
              /* Error state */
              <div className="flex flex-col items-center justify-center rounded-xl border border-rose-200 bg-rose-50 py-16 px-8 text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-rose-100">
                  <X className="h-7 w-7 text-rose-500" />
                </div>
                <h3 className="mb-2 font-semibold text-slate-900">
                  Erreur de chargement
                </h3>
                <p className="mb-6 max-w-xs text-sm text-slate-500">
                  {fetchError}
                </p>
                <Button
                  variant="outline"
                  onClick={() => window.location.reload()}
                  className="border-rose-200 text-rose-600 hover:bg-rose-100"
                >
                  Réessayer
                </Button>
              </div>
            ) : (
              <>
                {/* Result count */}
                <div className="mb-5 flex items-center justify-between">
                  <p className="text-sm text-slate-500">
                    <span className="font-semibold text-slate-800">
                      {filteredFormations.length}
                    </span>{" "}
                    formation
                    {filteredFormations.length !== 1 ? "s" : ""} trouvée
                    {filteredFormations.length !== 1 ? "s" : ""}
                  </p>
                </div>

                {filteredFormations.length > 0 ? (
                  <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                  >
                    <AnimatePresence>
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
                    </AnimatePresence>
                  </motion.div>
                ) : (
                  /* Empty state */
                  <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-white py-20 px-8 text-center">
                    <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-full bg-amber-50">
                      <GraduationCap className="h-8 w-8 text-amber-400" />
                    </div>
                    <h3 className="mb-2 font-[family-name:var(--font-playfair)] text-xl font-semibold text-slate-900">
                      Aucune formation trouvée
                    </h3>
                    <p className="mb-6 max-w-xs text-sm text-slate-500 leading-relaxed">
                      Essayez de modifier vos filtres ou votre recherche pour
                      découvrir d&apos;autres formations.
                    </p>
                    <Button
                      onClick={clearFilters}
                      className="bg-amber-500 text-white hover:bg-amber-600"
                    >
                      <X className="mr-2 h-4 w-4" />
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
