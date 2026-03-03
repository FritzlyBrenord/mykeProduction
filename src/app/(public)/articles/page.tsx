"use client";

import { motion } from "framer-motion";
import { Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import ArticleCard from "@/components/cards/ArticleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getCategoryLabel } from "@/lib/constants/articles";
import { Article } from "@/lib/types";

type PublicArticle = Article & {
  categories?: string[];
  comment_count?: number;
};

function normalizeText(value: string | null | undefined) {
  return (value ?? "").toLowerCase();
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

        if (!response.ok) {
          throw new Error("Impossible de charger les articles.");
        }

        const data = (await response.json()) as PublicArticle[];
        if (!active) return;
        setArticles(Array.isArray(data) ? data : []);
      } catch {
        if (!active) return;
        setErrorMessage("Impossible de recuperer les articles pour le moment.");
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
    const labels = articles.flatMap((article) => articleCategoryLabels(article));
    const unique = Array.from(new Set(labels)).sort((a, b) => a.localeCompare(b));
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

  const featuredArticle =
    !searchQuery.trim() && selectedCategory === "Toutes"
      ? filteredArticles[0]
      : null;

  const gridArticles = featuredArticle
    ? filteredArticles.slice(1)
    : filteredArticles;

  return (
    <div className="min-h-screen bg-[linear-gradient(180deg,#f8f3e8_0%,#fcfaf5_35%,#ffffff_100%)]">
      <section className="relative overflow-hidden border-b border-amber-200/60 pt-28">
        <div className="pointer-events-none absolute -top-16 left-1/2 h-64 w-64 -translate-x-1/2 rounded-full bg-amber-300/20 blur-3xl" />
        <div className="pointer-events-none absolute right-12 top-24 h-32 w-32 rounded-full border border-amber-300/40" />

        <div className="mx-auto max-w-7xl px-4 pb-12 sm:px-6 lg:px-8 lg:pb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="max-w-4xl"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-amber-300/70 bg-white/70 px-4 py-1 text-xs uppercase tracking-[0.22em] text-amber-900">
              <Sparkles className="h-3.5 w-3.5" />
              Journal Myke Industrie
            </div>

            <h1 className="font-[family-name:var(--font-playfair)] text-4xl font-semibold leading-tight text-slate-900 md:text-6xl">
              L&apos;edition classique des idees et de l&apos;industrie
            </h1>

            <p
              className="mt-5 max-w-3xl text-lg leading-relaxed text-slate-600"
              style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
            >
              Retrouvez des analyses de fond, des chroniques techniques et des retours terrain,
              presentes dans une experience de lecture premium, claire et intemporelle.
            </p>

            <div className="mt-8 flex flex-wrap items-center gap-6 text-sm text-slate-600">
              <div>
                <span className="font-[family-name:var(--font-playfair)] text-3xl text-slate-900">{articles.length}</span>
                <p>articles publies</p>
              </div>
              <div className="h-10 w-px bg-amber-300/70" />
              <div>
                <span className="font-[family-name:var(--font-playfair)] text-3xl text-slate-900">{Math.max(categories.length - 1, 0)}</span>
                <p>rubriques</p>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-2xl border border-amber-200/70 bg-white/80 p-4 shadow-lg shadow-amber-900/5 backdrop-blur md:p-5"
        >
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Rechercher un article, un sujet, une idee..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-11 border-amber-200/80 bg-white pl-10"
              />
            </div>

            <div className="flex gap-2 overflow-x-auto pb-1 md:pb-0">
              {categories.map((categoryName) => {
                const active = selectedCategory === categoryName;
                return (
                  <Button
                    key={categoryName}
                    variant={active ? "default" : "outline"}
                    size="sm"
                    onClick={() => setSelectedCategory(categoryName)}
                    className={`whitespace-nowrap ${
                      active
                        ? "bg-slate-900 text-amber-100 hover:bg-slate-800"
                        : "border-amber-200 text-slate-700 hover:bg-amber-50"
                    }`}
                  >
                    {categoryName}
                  </Button>
                );
              })}
            </div>
          </div>
        </motion.div>
      </section>

      <section className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        {loading ? (
          <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-10 text-center text-slate-500">
            Chargement des articles...
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-red-200 bg-white p-10 text-center">
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900">
              Erreur de chargement
            </h3>
            <p className="mt-2 text-slate-500">{errorMessage}</p>
            <Button className="mt-4" variant="outline" onClick={() => window.location.reload()}>
              Reessayer
            </Button>
          </div>
        ) : filteredArticles.length === 0 ? (
          <div className="rounded-2xl border border-amber-200/60 bg-white/80 p-10 text-center">
            <h3 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900">
              Aucun article trouve
            </h3>
            <p className="mt-2 text-slate-500">Essayez une autre recherche ou une autre rubrique.</p>
          </div>
        ) : (
          <div className="space-y-10">
            {featuredArticle && (
              <div>
                <ArticleCard article={featuredArticle} variant="featured" />
              </div>
            )}

            {gridArticles.length > 0 && (
              <div>
                <div className="mb-5 flex items-center justify-between">
                  <h2 className="font-[family-name:var(--font-playfair)] text-2xl font-semibold text-slate-900">
                    Dernieres publications
                  </h2>
                </div>

                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {gridArticles.map((article, index) => (
                    <ArticleCard key={article.id} article={article} index={index} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
