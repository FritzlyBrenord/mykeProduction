"use client";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Video } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { motion, AnimatePresence } from "framer-motion";
import {
  Eye,
  Heart,
  MessageCircle,
  Play,
  Search,
  Users,
  Flame,
  Lock,
  Globe,
  TrendingUp,
  Clock,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

type PublicVideo = Video & {
  description?: string | null;
  like_count?: number;
  comment_count?: number;
  allow_comments?: boolean;
};

type VideosResponse = {
  data: PublicVideo[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
};

const ACCESS_FILTERS = [
  { value: "all", label: "Tous", icon: Flame },
  { value: "public", label: "Gratuit", icon: Globe },
  { value: "members", label: "Membres", icon: Users },
  { value: "paid", label: "Payant", icon: Lock },
] as const;

const ITEMS_PER_PAGE = 12;

function AccessBadge({ video }: { video: PublicVideo }) {
  if (video.access_type === "public") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-emerald-400 backdrop-blur-sm border border-emerald-500/20">
        <Globe className="h-3 w-3" />
        Gratuit
      </span>
    );
  }
  if (video.access_type === "members") {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-blue-400 backdrop-blur-sm border border-blue-500/20">
        <Users className="h-3 w-3" />
        Membres
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-red-400 backdrop-blur-sm border border-red-500/20">
      <Lock className="h-3 w-3" />
      {formatPrice(Number(video.price || 0), "USD")}
    </span>
  );
}

function compactNumber(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}k`;
  return String(value || 0);
}

function extractYouTubeId(url: string | null) {
  if (!url) return null;
  const patterns = [
    /youtube\.com\/watch\?v=([^&\n?#]+)/i,
    /youtu\.be\/([^&\n?#]+)/i,
    /youtube\.com\/embed\/([^&\n?#]+)/i,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }
  return null;
}

function extractVimeoId(url: string | null) {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/i);
  return match?.[1] || null;
}

function VideoCard({ video, index }: { video: PublicVideo; index: number }) {
  const youtubeId = extractYouTubeId(video.video_url);
  const vimeoId = extractVimeoId(video.video_url);
  const staticPreview =
    video.thumbnail_url ||
    (youtubeId
      ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`
      : null) ||
    (vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null);

  return (
    <motion.article
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        delay: Math.min(index * 0.05, 0.3),
        duration: 0.5,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      className="group relative overflow-hidden rounded-xl bg-gradient-to-b from-slate-800/50 to-slate-900/50 backdrop-blur-sm border border-slate-700/30 shadow-lg shadow-black/20 transition-all duration-500 hover:scale-[1.02] hover:border-red-500/30 hover:shadow-xl hover:shadow-red-500/10"
    >
      <Link href={`/videos/${video.slug}`} className="block">
        <div className="relative aspect-video overflow-hidden bg-gradient-to-br from-slate-800 to-slate-900">
          {staticPreview ? (
            <Image
              src={staticPreview}
              alt={video.title}
              fill
              className="object-cover transition-transform duration-700 group-hover:scale-110"
            />
          ) : video.video_type === "upload" && video.video_url ? (
            <video
              src={video.video_url}
              muted
              playsInline
              preload="metadata"
              className="pointer-events-none h-full w-full object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <Play className="h-12 w-12 text-slate-600" />
            </div>
          )}

          <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-red-500/0 via-red-500/0 to-red-500/10 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

          <div className="absolute left-3 top-3 flex items-center gap-2">
            <AccessBadge video={video} />
            {(video.view_count || 0) > 1000 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-red-500/80 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white shadow-lg shadow-red-500/30">
                <TrendingUp className="h-3 w-3" />
                Hot
              </span>
            )}
          </div>

          <div className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-300 group-hover:opacity-100">
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-red-500 to-red-600 shadow-2xl shadow-red-500/40 backdrop-blur-sm ring-4 ring-red-500/20"
            >
              <Play className="h-7 w-7 fill-white text-white ml-1" />
            </motion.div>
          </div>

          <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-medium text-slate-300/90">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 px-2 py-1 backdrop-blur-sm">
                <Eye className="h-3 w-3" />
                {compactNumber(Number(video.view_count || 0))}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 px-2 py-1 backdrop-blur-sm">
                <Heart className="h-3 w-3" />
                {compactNumber(Number(video.like_count || 0))}
              </span>
            </div>
            {(video.comment_count ?? 0) > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-950/60 px-2 py-1 text-xs font-medium text-slate-300/90 backdrop-blur-sm">
                <MessageCircle className="h-3 w-3" />
                {compactNumber(Number(video.comment_count || 0))}
              </span>
            )}
          </div>
        </div>

        <div className="relative p-4 bg-gradient-to-b from-slate-900/50 to-slate-950/50">
          <div className="absolute left-0 top-0 h-0.5 w-0 bg-gradient-to-r from-red-500 to-red-400 transition-all duration-500 group-hover:w-full" />

          <h2 className="line-clamp-2 text-[15px] font-semibold leading-snug text-slate-100 transition-colors duration-300 group-hover:text-red-400">
            {video.title}
          </h2>
          {video.description && (
            <p className="mt-2 line-clamp-2 text-sm text-slate-400/80 leading-relaxed">
              {video.description}
            </p>
          )}

          <div className="mt-3 flex items-center gap-2 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(video.created_at).toLocaleDateString("fr-FR", {
                day: "numeric",
                month: "short",
              })}
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
  );
}

export default function VideosPage() {
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedAccess, setSelectedAccess] =
    useState<(typeof ACCESS_FILTERS)[number]["value"]>("all");
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState({
    page: 1,
    limit: ITEMS_PER_PAGE,
    total: 0,
    totalPages: 1,
  });

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setQuery(queryInput.trim());
      setPage(1);
    }, 280);
    return () => window.clearTimeout(timer);
  }, [queryInput]);

  useEffect(() => {
    let active = true;
    const fetchVideos = async () => {
      try {
        setLoading(true);
        setErrorMessage(null);
        const searchParams = new URLSearchParams({
          page: String(page),
          limit: String(ITEMS_PER_PAGE),
        });
        if (query) searchParams.set("search", query);
        if (selectedAccess !== "all")
          searchParams.set("access", selectedAccess);

        const response = await fetch(`/api/videos?${searchParams.toString()}`, {
          method: "GET",
          cache: "no-store",
        });
        if (!response.ok) throw new Error("Impossible de charger les vidéos.");

        const payload = (await response.json()) as VideosResponse;
        if (!active) return;
        setVideos(Array.isArray(payload.data) ? payload.data : []);
        setMeta(
          payload.meta || {
            page,
            limit: ITEMS_PER_PAGE,
            total: 0,
            totalPages: 1,
          },
        );
      } catch (error) {
        if (!active) return;
        setVideos([]);
        setMeta({ page: 1, limit: ITEMS_PER_PAGE, total: 0, totalPages: 1 });
        setErrorMessage(
          error instanceof Error ? error.message : "Erreur de chargement.",
        );
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchVideos();
    return () => {
      active = false;
    };
  }, [page, query, selectedAccess]);

  const hasResults = useMemo(() => videos.length > 0, [videos.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-slate-100 pt-20">
      <div className="relative overflow-hidden border-b border-slate-800/50 bg-gradient-to-r from-slate-900/80 to-slate-800/80 backdrop-blur-xl">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-red-500/20 via-transparent to-transparent" />
          <div className="absolute right-0 top-0 h-64 w-64 bg-gradient-to-bl from-red-500/10 to-transparent blur-3xl" />
        </div>

        <div className="relative mx-auto max-w-7xl px-5 py-12 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div className="space-y-2">
              <motion.p
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-red-500/20 to-red-600/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.2em] text-red-400 border border-red-500/20"
              >
                <Flame className="h-3.5 w-3.5" />
                Myke Industrie · Vidéos
              </motion.p>
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="text-4xl font-bold text-white sm:text-5xl lg:text-6xl"
              >
                Découvrez nos{" "}
                <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">
                  vidéos
                </span>
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="max-w-xl text-base text-slate-400 leading-relaxed"
              >
                Parcourez notre catalogue de formations vidéo. Likez, commentez
                et apprenez à votre rythme avec un accès sécurisé selon votre
                abonnement.
              </motion.p>
            </div>

            {meta.total > 0 && !loading && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.3 }}
                className="flex flex-col items-center sm:items-end rounded-2xl bg-gradient-to-br from-slate-800/50 to-slate-900/50 p-4 border border-slate-700/30 backdrop-blur-sm"
              >
                <span className="text-4xl font-bold bg-gradient-to-br from-white to-slate-300 bg-clip-text text-transparent">
                  {meta.total}
                </span>
                <span className="text-xs font-medium text-slate-500 uppercase tracking-widest">
                  vidéo{meta.total > 1 ? "s" : ""} disponible
                  {meta.total > 1 ? "s" : ""}
                </span>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      <div className="sticky top-0 z-30 border-b border-slate-800/50 bg-slate-950/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-5 sm:px-8 lg:px-10">
          <div className="flex flex-col gap-4 py-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
              <Input
                value={queryInput}
                onChange={(e) => setQueryInput(e.target.value)}
                placeholder="Rechercher une vidéo..."
                className="h-12 border-slate-700/50 bg-slate-800/50 pl-11 text-sm text-slate-100 placeholder:text-slate-500 focus:border-red-500/50 focus:bg-slate-800 focus:ring-2 focus:ring-red-500/20 rounded-xl transition-all"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {ACCESS_FILTERS.map((filter) => {
                const active = selectedAccess === filter.value;
                const Icon = filter.icon;
                return (
                  <motion.button
                    key={filter.value}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => {
                      setSelectedAccess(filter.value);
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold uppercase tracking-wider transition-all duration-300 ${
                      active
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25 border border-red-400/50"
                        : "border border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:text-slate-200 hover:bg-slate-800/50"
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {filter.label}
                  </motion.button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-5 py-10 sm:px-8 lg:px-10">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div
                key={i}
                className="overflow-hidden rounded-xl border border-slate-700/30 bg-gradient-to-b from-slate-800/50 to-slate-900/50"
              >
                <div className="aspect-video animate-pulse bg-gradient-to-br from-slate-800 to-slate-900" />
                <div className="space-y-3 p-4">
                  <div className="h-4 w-3/4 animate-pulse rounded-lg bg-slate-700/50" />
                  <div className="h-3 w-full animate-pulse rounded-lg bg-slate-700/50" />
                  <div className="h-3 w-2/3 animate-pulse rounded-lg bg-slate-700/50" />
                </div>
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-red-500/20 bg-gradient-to-br from-red-500/5 to-red-900/10 p-12 text-center"
          >
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-500/10">
              <Play className="h-8 w-8 text-red-400" />
            </div>
            <p className="text-lg font-medium text-red-400">{errorMessage}</p>
            <button
              onClick={() => setPage(1)}
              className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-red-500 to-red-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition-all hover:shadow-red-500/40 hover:scale-105"
            >
              Réessayer
            </button>
          </motion.div>
        ) : !hasResults ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border border-slate-700/30 bg-gradient-to-b from-slate-800/30 to-slate-900/30 p-16 text-center"
          >
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-slate-800/50">
              <Search className="h-10 w-10 text-slate-500" />
            </div>
            <p className="text-xl font-semibold text-slate-200">
              Aucune vidéo trouvée
            </p>
            <p className="mt-2 text-slate-400">
              Modifiez votre recherche ou le filtre d&apos;accès
            </p>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={`${query}-${selectedAccess}-${page}`}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="mb-6 flex items-center gap-4">
                <span className="text-sm font-medium text-slate-400">
                  {meta.total} vidéo{meta.total > 1 ? "s" : ""}
                  {query && (
                    <span className="ml-2 text-slate-500">
                      pour « <span className="text-red-400">{query}</span> »
                    </span>
                  )}
                </span>
                <div className="h-px flex-1 bg-gradient-to-r from-slate-700/50 to-transparent" />
                {meta.totalPages > 1 && (
                  <span className="text-sm text-slate-500">
                    Page{" "}
                    <span className="text-slate-300 font-semibold">
                      {meta.page}
                    </span>{" "}
                    / {meta.totalPages}
                  </span>
                )}
              </div>

              <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {videos.map((video, index) => (
                  <VideoCard key={video.id} video={video} index={index} />
                ))}
              </div>
            </motion.div>
          </AnimatePresence>
        )}

        {meta.totalPages > 1 && !loading && !errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-12 flex items-center justify-center gap-3"
          >
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={page <= 1}
              onClick={() => setPage((c) => Math.max(1, c - 1))}
              className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              ← Précédent
            </motion.button>

            <div className="flex gap-1.5">
              {Array.from({ length: Math.min(meta.totalPages, 7) }, (_, i) => {
                const pageNum = i + 1;
                const isActive = pageNum === page;
                return (
                  <motion.button
                    key={pageNum}
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => setPage(pageNum)}
                    className={`h-10 w-10 rounded-xl text-sm font-semibold transition-all ${
                      isActive
                        ? "bg-gradient-to-r from-red-500 to-red-600 text-white shadow-lg shadow-red-500/25"
                        : "border border-slate-700/50 bg-slate-800/30 text-slate-400 hover:border-slate-600 hover:bg-slate-800/50 hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </motion.button>
                );
              })}
              {meta.totalPages > 7 && (
                <span className="flex h-10 w-10 items-center justify-center text-slate-600">
                  …
                </span>
              )}
            </div>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              disabled={page >= meta.totalPages}
              onClick={() => setPage((c) => Math.min(meta.totalPages, c + 1))}
              className="rounded-xl border border-slate-700/50 bg-slate-800/30 px-5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:border-slate-600 hover:bg-slate-800/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:scale-100"
            >
              Suivant →
            </motion.button>
          </motion.div>
        )}
      </div>
    </div>
  );
}
