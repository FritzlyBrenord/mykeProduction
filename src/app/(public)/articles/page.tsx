"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Search, BookOpen, TrendingUp, ChevronRight } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ArticleCard from "@/components/cards/ArticleCard";
import { Input } from "@/components/ui/input";
import { getCategoryLabel } from "@/lib/constants/articles";
import { Article } from "@/lib/types";

type PublicArticle = Article & {
  categories?: string[];
  comment_count?: number;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function articleCategoryLabels(article: PublicArticle) {
  const fromArray = (article.categories ?? []).map((categoryId) =>
    getCategoryLabel(categoryId),
  );
  const fromMain = article.category?.name ? [article.category.name] : [];
  return Array.from(new Set([...fromArray, ...fromMain]));
}

export default function ArticlesPage() {
  const [articles, setArticles] = useState<PublicArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");

  useEffect(() => {
    let active = true;
    const fetchArticles = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const response = await fetch("/api/articles?limit=200", {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok)
          throw new Error("Impossible de charger les articles.");
        const data = (await response.json()) as PublicArticle[];
        if (!active) return;
        setArticles(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setErrorMessage("Impossible de récupérer les articles pour le moment.");
        setArticles([]);
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchArticles();
    return () => {
      active = false;
    };
  }, []);

  const categories = useMemo(() => {
    const labels = articles.flatMap((article) =>
      articleCategoryLabels(article),
    );
    const unique = Array.from(new Set(labels)).sort((a, b) =>
      a.localeCompare(b),
    );
    return ["Toutes", ...unique];
  }, [articles]);

  const filteredArticles = useMemo(() => {
    const search = normalizeText(searchQuery.trim());
    return articles.filter((article) => {
      const title = normalizeText(article.title);
      const excerpt = normalizeText(article.excerpt);
      const labels = articleCategoryLabels(article);
      const matchesSearch =
        !search || title.includes(search) || excerpt.includes(search);
      const matchesCategory =
        selectedCategory === "Toutes" || labels.includes(selectedCategory);
      return matchesSearch && matchesCategory;
    });
  }, [articles, searchQuery, selectedCategory]);

  const isFiltered = searchQuery.trim() || selectedCategory !== "Toutes";
  const featuredArticle = !isFiltered ? filteredArticles[0] : null;
  const secondaryArticles = !isFiltered ? filteredArticles.slice(1, 3) : [];
  const gridArticles = !isFiltered
    ? filteredArticles.slice(3)
    : filteredArticles;

  return (
    <div className="min-h-screen bg-stone-50">
      {/* ─── HERO / MASTHEAD ─── */}
      <section className="relative border-b border-stone-200 bg-white pt-28 pb-0 overflow-hidden">
        {/* Subtle background ornament */}
        <div className="pointer-events-none absolute right-0 top-0 h-full w-1/2 bg-[radial-gradient(ellipse_at_top_right,rgba(245,158,11,0.06),transparent_70%)]" />
        <div className="pointer-events-none absolute bottom-0 left-0 h-px w-full bg-gradient-to-r from-transparent via-amber-300/60 to-transparent" />

        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          {/* Masthead line */}
          <div className="mb-8 flex items-center gap-4">
            <div className="h-px flex-1 bg-stone-200" />
            <span className="text-[10px] font-bold uppercase tracking-[0.35em] text-stone-400">
              Myke Industrie · Journal
            </span>
            <div className="h-px flex-1 bg-stone-200" />
          </div>

          {/* Title block */}
          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
            className="pb-10"
          >
            <h1 className="font-[family-name:var(--font-playfair)] text-5xl font-bold leading-tight text-stone-950 md:text-7xl">
              L&apos;édition
              <br />
              <span className="text-amber-600">classique</span> des idées
            </h1>

            <p
              className="mt-6 max-w-2xl text-lg leading-relaxed text-stone-500"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Analyses de fond, chroniques techniques et retours terrain —
              présentés dans une expérience de lecture premium, claire et
              intemporelle.
            </p>

            {/* Stats row */}
            <div className="mt-8 flex items-center gap-8">
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-stone-900">
                  {articles.length}
                </span>
                <span className="text-xs uppercase tracking-widest text-stone-400">
                  Articles publiés
                </span>
              </div>
              <div className="h-12 w-px bg-stone-200" />
              <div className="flex flex-col">
                <span className="font-[family-name:var(--font-playfair)] text-4xl font-bold text-stone-900">
                  {Math.max(categories.length - 1, 0)}
                </span>
                <span className="text-xs uppercase tracking-widest text-stone-400">
                  Rubriques
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ─── SEARCH + FILTER BAR ─── */}
      <section className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur-md shadow-sm">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-3 py-4 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-stone-400" />
              <Input
                placeholder="Rechercher un article, un sujet…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10 border-stone-200 bg-stone-50 pl-10 text-sm text-stone-800 placeholder:text-stone-400 focus:bg-white focus:border-amber-400 focus:ring-0"
              />
            </div>

            {/* Category pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0 scrollbar-hide">
              {categories.map((cat) => {
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(cat)}
                    className={`whitespace-nowrap rounded-full px-4 py-1.5 text-[11px] font-semibold uppercase tracking-wider transition-all duration-200 ${
                      active
                        ? "bg-stone-900 text-white shadow-sm"
                        : "border border-stone-200 text-stone-500 hover:border-stone-400 hover:text-stone-800"
                    }`}
                  >
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </section>

      {/* ─── CONTENT ─── */}
      <div className="mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
        {loading ? (
          /* Skeleton loader */
          <div className="space-y-8">
            <div className="h-[420px] animate-pulse rounded-2xl bg-stone-200" />
            <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="h-64 animate-pulse rounded-xl bg-stone-200"
                />
              ))}
            </div>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-100 bg-white p-12 text-center shadow-sm">
            <BookOpen className="mx-auto mb-4 h-12 w-12 text-red-300" />
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-stone-900">
              Erreur de chargement
            </h3>
            <p className="mt-2 text-stone-500">{errorMessage}</p>
            <button
              onClick={() => window.location.reload()}
              className="mt-5 rounded-full border border-stone-300 px-5 py-2 text-sm font-medium text-stone-700 transition-colors hover:bg-stone-100"
            >
              Réessayer
            </button>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-2xl border border-stone-100 bg-white p-14 text-center shadow-sm">
            <Search className="mx-auto mb-4 h-12 w-12 text-stone-300" />
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-stone-900">
              Aucun article trouvé
            </h3>
            <p className="mt-2 text-stone-400">
              Essayez une autre recherche ou une autre rubrique.
            </p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${searchQuery}-${selectedCategory}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="space-y-12"
            >
              {/* Featured hero article */}
              {featuredArticle && (
                <div>
                  <ArticleCard article={featuredArticle} variant="featured" />
                </div>
              )}

              {/* 2-column secondary grid */}
              {secondaryArticles.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <TrendingUp className="h-4 w-4 text-amber-500" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">
                      À lire également
                    </h2>
                    <div className="h-px flex-1 bg-stone-200" />
                  </div>
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {secondaryArticles.map((article, i) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        index={i}
                        variant="horizontal"
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Main grid */}
              {gridArticles.length > 0 && (
                <div>
                  <div className="mb-6 flex items-center gap-3">
                    <div className="h-px flex-1 bg-stone-200" />
                    <h2 className="text-xs font-bold uppercase tracking-widest text-stone-500">
                      {isFiltered
                        ? `${filteredArticles.length} résultat${filteredArticles.length > 1 ? "s" : ""}`
                        : "Dernières publications"}
                    </h2>
                    <div className="h-px flex-1 bg-stone-200" />
                  </div>
                  <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {gridArticles.map((article, index) => (
                      <ArticleCard
                        key={article.id}
                        article={article}
                        index={index}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Load more hint */}
              {!isFiltered && filteredArticles.length > 3 && (
                <div className="flex items-center justify-center pt-4">
                  <div className="flex items-center gap-2 text-xs text-stone-400">
                    <ChevronRight className="h-3 w-3" />
                    <span>{filteredArticles.length} articles au total</span>
                  </div>
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
