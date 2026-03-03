"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Video } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { motion } from "framer-motion";
import {
  Eye,
  Heart,
  MessageCircle,
  Play,
  Search,
  Sparkles,
  Users,
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
  { value: "all", label: "Tous" },
  { value: "public", label: "Gratuit" },
  { value: "members", label: "Membres" },
  { value: "paid", label: "Payant" },
] as const;

const ITEMS_PER_PAGE = 12;

function accessBadge(video: PublicVideo) {
  if (video.access_type === "public") {
    return <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Gratuit</Badge>;
  }
  if (video.access_type === "members") {
    return (
      <Badge className="bg-blue-600 text-white hover:bg-blue-600">
        <Users className="mr-1 h-3 w-3" />
        Membres
      </Badge>
    );
  }
  return (
    <Badge className="bg-amber-500 text-black hover:bg-amber-500">
      {formatPrice(Number(video.price || 0), "USD")}
    </Badge>
  );
}

function compactNumber(value: number) {
  return Number(value || 0).toLocaleString("fr-FR");
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

export default function VideosPage() {
  const [videos, setVideos] = useState<PublicVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [queryInput, setQueryInput] = useState("");
  const [query, setQuery] = useState("");
  const [selectedAccess, setSelectedAccess] = useState<(typeof ACCESS_FILTERS)[number]["value"]>("all");
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

        if (query) {
          searchParams.set("search", query);
        }
        if (selectedAccess !== "all") {
          searchParams.set("access", selectedAccess);
        }

        const response = await fetch(`/api/videos?${searchParams.toString()}`, {
          method: "GET",
          cache: "no-store",
        });

        if (!response.ok) {
          throw new Error("Impossible de charger les videos.");
        }

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
        setMeta({
          page: 1,
          limit: ITEMS_PER_PAGE,
          total: 0,
          totalPages: 1,
        });
        setErrorMessage(error instanceof Error ? error.message : "Erreur de chargement.");
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchVideos();

    return () => {
      active = false;
    };
  }, [page, query, selectedAccess]);

  const hasResults = useMemo(() => videos.length > 0, [videos.length]);

  return (
    <div className="min-h-screen bg-background pt-24 text-foreground">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,hsl(var(--gold)/0.18),transparent_45%),radial-gradient(circle_at_top_right,hsl(var(--navy)/0.14),transparent_45%)]" />
        <div className="relative mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-400/45 bg-amber-300/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-amber-700 dark:text-amber-300">
            <Sparkles className="h-3.5 w-3.5" />
            Video social premium
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl">Videos</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
            Parcourez les videos, likes et commentaires comme un flux social. Le lecteur detail est
            protege selon le type d&apos;acces.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 rounded-2xl border border-border bg-card p-4 shadow-sm">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr),auto] md:items-center">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={queryInput}
                onChange={(event) => setQueryInput(event.target.value)}
                placeholder="Rechercher une video par titre ou description..."
                className="pl-10"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              {ACCESS_FILTERS.map((filter) => (
                <Button
                  key={filter.value}
                  type="button"
                  size="sm"
                  variant={selectedAccess === filter.value ? "default" : "outline"}
                  onClick={() => {
                    setSelectedAccess(filter.value);
                    setPage(1);
                  }}
                >
                  {filter.label}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div
                key={index}
                className="animate-pulse overflow-hidden rounded-2xl border border-border bg-card"
              >
                <div className="aspect-video bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-3/4 rounded bg-muted" />
                  <div className="h-3 w-full rounded bg-muted" />
                  <div className="h-3 w-4/5 rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center">
            <p className="font-medium text-destructive">{errorMessage}</p>
            <Button type="button" className="mt-4" onClick={() => setPage(1)}>
              Reessayer
            </Button>
          </div>
        ) : !hasResults ? (
          <div className="rounded-2xl border border-border bg-card p-10 text-center">
            <p className="text-lg font-medium">Aucune video trouvee</p>
            <p className="mt-2 text-sm text-muted-foreground">
              Modifiez la recherche ou le filtre d&apos;acces.
            </p>
          </div>
        ) : (
          <>
            <div className="mb-4 text-sm text-muted-foreground">
              {meta.total} video{meta.total > 1 ? "s" : ""} trouvee{meta.total > 1 ? "s" : ""}
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {videos.map((video, index) => (
                (() => {
                  const youtubeId = extractYouTubeId(video.video_url);
                  const vimeoId = extractVimeoId(video.video_url);
                  const staticPreview =
                    video.thumbnail_url ||
                    (youtubeId ? `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg` : null) ||
                    (vimeoId ? `https://vumbnail.com/${vimeoId}.jpg` : null);

                  return (
                <motion.article
                  key={video.id}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(index * 0.04, 0.2) }}
                  className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
                >
                  <Link href={`/videos/${video.slug}`} className="block">
                    <div className="relative aspect-video overflow-hidden bg-muted">
                      {staticPreview ? (
                        <Image
                          src={staticPreview}
                          alt={video.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
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
                        <Image
                          src="/images/placeholder-video.svg"
                          alt={video.title}
                          fill
                          className="object-cover transition duration-500 group-hover:scale-105"
                        />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/10 to-transparent" />
                      <div className="absolute left-3 top-3">{accessBadge(video)}</div>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="rounded-full bg-white/85 p-3 text-black shadow-lg">
                          <Play className="h-5 w-5 fill-current" />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3 p-4">
                      <h2 className="line-clamp-2 text-base font-semibold text-foreground transition-colors group-hover:text-amber-600 dark:group-hover:text-amber-400">
                        {video.title}
                      </h2>
                      {video.description && (
                        <p className="line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5" />
                          {compactNumber(Number(video.view_count || 0))}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Heart className="h-3.5 w-3.5" />
                          {compactNumber(Number(video.like_count || 0))}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <MessageCircle className="h-3.5 w-3.5" />
                          {compactNumber(Number(video.comment_count || 0))}
                        </span>
                      </div>
                    </div>
                  </Link>
                </motion.article>
                  );
                })()
              ))}
            </div>
          </>
        )}

        {meta.totalPages > 1 && !loading && !errorMessage && (
          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card p-4">
            <p className="text-sm text-muted-foreground">
              Page {meta.page} sur {meta.totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((current) => Math.max(1, current - 1))}
              >
                Precedent
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={page >= meta.totalPages}
                onClick={() => setPage((current) => Math.min(meta.totalPages, current + 1))}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
