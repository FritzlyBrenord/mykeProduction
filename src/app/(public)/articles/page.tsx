"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Sparkles, X } from "lucide-react";
import { Article } from "@/lib/types";
import ArticleCard from "@/components/cards/ArticleCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const mockArticles: Article[] = [
  {
    id: "1",
    title: "Les nouvelles réglementations REACH 2024 : ce qui change",
    slug: "nouvelles-reglementations-reach-2024",
    excerpt:
      "Analyse des dernières modifications du règlement REACH et leur impact sur les industries chimiques européennes.",
    content: "...",
    thumbnail_url:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
    status: "published",
    category_id: "1",
    published_at: "2024-02-20",
    view_count: 1250,
    reading_time: 8,
    allow_comments: true,
    created_at: "2024-02-20",
    updated_at: "2024-02-20",
    category: {
      id: "1",
      name: "Réglementation",
      slug: "reglementation",
      type: "article",
    },
  },
  {
    id: "2",
    title: "L'hydrolyse acide : mécanismes et applications industrielles",
    slug: "hydrolyse-acide-mecanismes-applications",
    excerpt:
      "Comprendre les mécanismes de l'hydrolyse acide et ses nombreuses applications dans l'industrie chimique.",
    content: "...",
    thumbnail_url:
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800",
    status: "published",
    category_id: "2",
    published_at: "2024-02-15",
    view_count: 890,
    reading_time: 12,
    allow_comments: true,
    created_at: "2024-02-15",
    updated_at: "2024-02-15",
    category: { id: "2", name: "Chimie", slug: "chimie", type: "article" },
  },
  {
    id: "3",
    title: "Industrie 4.0 : transformation digitale des usines",
    slug: "industrie-4-0-transformation-digitale",
    excerpt:
      "Comment l'Industrie 4.0 révolutionne les processus de production et la gestion des usines modernes.",
    content: "...",
    thumbnail_url:
      "https://images.unsplash.com/photo-1565514020176-db9e1b95da24?w=800",
    status: "published",
    category_id: "3",
    published_at: "2024-02-10",
    view_count: 2100,
    reading_time: 10,
    allow_comments: true,
    created_at: "2024-02-10",
    updated_at: "2024-02-10",
    category: {
      id: "3",
      name: "Technologie",
      slug: "technologie",
      type: "article",
    },
  },
  {
    id: "4",
    title: "Gestion des déchets chimiques : meilleures pratiques",
    slug: "gestion-dechets-chimiques-pratiques",
    excerpt:
      "Guide complet pour la gestion responsable et conforme des déchets chimiques en entreprise.",
    content: "...",
    thumbnail_url:
      "https://images.unsplash.com/photo-1530587191325-3db32d826c18?w=800",
    status: "published",
    category_id: "4",
    published_at: "2024-02-05",
    view_count: 756,
    reading_time: 15,
    allow_comments: true,
    created_at: "2024-02-05",
    updated_at: "2024-02-05",
    category: {
      id: "4",
      name: "Environnement",
      slug: "environnement",
      type: "article",
    },
  },
];

const categories = [
  "Toutes",
  "Réglementation",
  "Chimie",
  "Technologie",
  "Environnement",
];

export default function ArticlesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Toutes");

  const filteredArticles = mockArticles.filter((article) => {
    const matchesSearch =
      article.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      article.excerpt?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "Toutes" ||
      article.category?.name === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const featuredArticle = filteredArticles[0];
  const otherArticles = filteredArticles.slice(1);

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
                Blog
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl lg:text-5xl font-semibold text-slate-900">
              Nos articles
            </h1>
            <p className="text-slate-600 mt-3 max-w-2xl text-lg">
              Actualités, analyses et conseils d'experts sur l'industrie et la
              chimie.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher un article..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {categories.map((cat) => (
              <Button
                key={cat}
                variant={selectedCategory === cat ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(cat)}
                className="whitespace-nowrap"
              >
                {cat}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        {filteredArticles.length > 0 ? (
          <div className="space-y-8">
            {/* Featured Article */}
            {featuredArticle &&
              !searchQuery &&
              selectedCategory === "Toutes" && (
                <div className="mb-8">
                  <ArticleCard article={featuredArticle} variant="featured" />
                </div>
              )}

            {/* Other Articles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(searchQuery || selectedCategory !== "Toutes"
                ? filteredArticles
                : otherArticles
              ).map((article, index) => (
                <ArticleCard key={article.id} article={article} index={index} />
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-medium text-slate-900 mb-2">
              Aucun article trouvé
            </h3>
            <p className="text-slate-500">
              Essayez de modifier votre recherche
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
