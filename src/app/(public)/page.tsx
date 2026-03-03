"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AlertCircle, Loader2 } from "lucide-react";
import HeroSection from "@/components/sections/HeroSection";
import FeaturedFormations from "@/components/sections/FeaturedFormations";
import FeaturedProducts from "@/components/sections/FeaturedProducts";
import LatestArticles from "@/components/sections/LatestArticles";
import LatestVideos from "@/components/sections/LatestVideos";
import { Article, Formation, Produit, Video } from "@/lib/types";

type CollectionPayload<T> = T[] | { data?: T[] };

function extractCollection<T>(payload: CollectionPayload<T>): T[] {
  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.data)) {
    return payload.data;
  }

  return [];
}

async function fetchCollection<T>(url: string): Promise<T[]> {
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`Request failed for ${url}`);
  }

  const payload = (await response.json()) as CollectionPayload<T>;
  return extractCollection(payload);
}

export default function HomePage() {
  const [formations, setFormations] = useState<Formation[]>([]);
  const [produits, setProduits] = useState<Produit[]>([]);
  const [articles, setArticles] = useState<Article[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingError, setLoadingError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadHomepageData = async () => {
      setLoading(true);
      setLoadingError(null);

      const [formationsResult, produitsResult, articlesResult, videosResult] =
        await Promise.allSettled([
          fetchCollection<Formation>("/api/formations?limit=8"),
          fetchCollection<Produit>("/api/produits?limit=8"),
          fetchCollection<Article>("/api/articles?limit=1"),
          fetchCollection<Video>("/api/videos?limit=6"),
        ]);

      if (cancelled) return;

      let hasError = false;

      if (formationsResult.status === "fulfilled") {
        setFormations(formationsResult.value.slice(0, 8));
      } else {
        setFormations([]);
        hasError = true;
      }

      if (produitsResult.status === "fulfilled") {
        setProduits(produitsResult.value.slice(0, 8));
      } else {
        setProduits([]);
        hasError = true;
      }

      if (articlesResult.status === "fulfilled") {
        setArticles(articlesResult.value.slice(0, 1));
      } else {
        setArticles([]);
        hasError = true;
      }

      if (videosResult.status === "fulfilled") {
        setVideos(videosResult.value.slice(0, 6));
      } else {
        setVideos([]);
        hasError = true;
      }

      if (hasError) {
        setLoadingError(
          "Certaines sections n'ont pas pu etre chargees. Reessayez dans quelques instants.",
        );
      }

      setLoading(false);
    };

    void loadHomepageData();

    return () => {
      cancelled = true;
    };
  }, []);

  const hasAnySectionData =
    formations.length > 0 ||
    produits.length > 0 ||
    articles.length > 0 ||
    videos.length > 0;

  return (
    <div className="min-h-screen">
      <HeroSection />

      {loadingError && (
        <section className="px-4 sm:px-6 lg:px-8 py-8 bg-slate-950">
          <div className="mx-auto max-w-7xl rounded-xl border border-amber-400/30 bg-amber-400/10 p-4 text-amber-100 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <p className="text-sm">{loadingError}</p>
          </div>
        </section>
      )}

      {loading && !hasAnySectionData ? (
        <section className="px-4 sm:px-6 lg:px-8 py-16 bg-slate-950">
          <div className="mx-auto max-w-7xl flex items-center justify-center gap-3 text-slate-200">
            <Loader2 className="w-5 h-5 animate-spin" />
            <span>Chargement des contenus recents...</span>
          </div>
        </section>
      ) : (
        <>
          {formations.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
            >
              <FeaturedFormations formations={formations} />
            </motion.div>
          )}

          {produits.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <FeaturedProducts produits={produits} />
            </motion.div>
          )}

          {articles.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <LatestArticles articles={articles} />
            </motion.div>
          )}

          {videos.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <LatestVideos videos={videos} />
            </motion.div>
          )}
        </>
      )}
    </div>
  );
}
