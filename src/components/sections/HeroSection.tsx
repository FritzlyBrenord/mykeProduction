"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Award,
  BookOpen,
  ChevronDown,
  PauseCircle,
  PlayCircle,
  ShoppingBag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import { extractVimeoId, extractYouTubeId } from "@/lib/video-utils";

type HomeStatsResponse = {
  data?: {
    formations?: number;
    articles?: number;
    produits?: number;
    videos?: number;
  };
};

type PublicVideo = {
  id: string;
  title: string;
  slug: string;
  video_url: string | null;
  video_type: "upload" | "youtube" | "vimeo";
  thumbnail_url: string | null;
  description?: string | null;
};

type VideosResponse = {
  data?: PublicVideo[];
};

const DEFAULT_STATS = {
  formations: 0,
  articles: 0,
  produits: 0,
  videos: 0,
};

function formatPlus(value: number) {
  return `${Number(value || 0).toLocaleString("fr-FR")}+`;
}

function getPreviewImage(video: PublicVideo | null) {
  if (!video) return "/images/placeholder-video.svg";
  if (video.thumbnail_url) return video.thumbnail_url;

  if (video.video_type === "youtube" && video.video_url) {
    const id = extractYouTubeId(video.video_url);
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`;
  }

  if (video.video_type === "vimeo" && video.video_url) {
    const id = extractVimeoId(video.video_url);
    if (id) return `https://vumbnail.com/${id}.jpg`;
  }

  return "/images/placeholder-video.svg";
}

function getEmbedUrl(video: PublicVideo | null) {
  if (!video || !video.video_url) return null;

  if (video.video_type === "youtube") {
    const id = extractYouTubeId(video.video_url);
    return id
      ? `https://www.youtube.com/embed/${id}?autoplay=1&start=0&end=30&controls=0&disablekb=1&fs=0&rel=0&modestbranding=1`
      : null;
  }

  if (video.video_type === "vimeo") {
    const id = extractVimeoId(video.video_url);
    return id
      ? `https://player.vimeo.com/video/${id}?autoplay=1&controls=0&title=0&byline=0&portrait=0&dnt=1`
      : null;
  }

  return null;
}

export default function HeroSection() {
  const [stats, setStats] = useState(DEFAULT_STATS);
  const [videoPool, setVideoPool] = useState<PublicVideo[]>([]);
  const [selectedVideo, setSelectedVideo] = useState<PublicVideo | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const loadHeroData = async () => {
      const [statsResult, videosResult] = await Promise.allSettled([
        fetch("/api/home/stats", { cache: "no-store" }),
        fetch("/api/videos?access=public&limit=20", { cache: "no-store" }),
      ]);

      if (cancelled) return;

      if (statsResult.status === "fulfilled" && statsResult.value.ok) {
        const payload = (await statsResult.value.json()) as HomeStatsResponse;
        setStats({
          formations: Number(payload.data?.formations || 0),
          articles: Number(payload.data?.articles || 0),
          produits: Number(payload.data?.produits || 0),
          videos: Number(payload.data?.videos || 0),
        });
      }

      if (videosResult.status === "fulfilled" && videosResult.value.ok) {
        const payload = (await videosResult.value.json()) as VideosResponse;
        const videos = Array.isArray(payload.data) ? payload.data : [];
        setVideoPool(videos);
        if (videos.length > 0) {
          const randomIndex = Math.floor(Math.random() * videos.length);
          setSelectedVideo(videos[randomIndex]);
        }
      }
    };

    void loadHeroData();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!playing) return;

    const timer = window.setTimeout(() => {
      setPlaying(false);
    }, 30000);

    return () => {
      window.clearTimeout(timer);
    };
  }, [playing, selectedVideo?.id]);

  const embedUrl = useMemo(() => getEmbedUrl(selectedVideo), [selectedVideo]);
  const previewImage = useMemo(
    () => getPreviewImage(selectedVideo),
    [selectedVideo],
  );

  const statItems = useMemo(
    () => [
      { value: formatPlus(stats.formations), label: "Formations" },
      { value: formatPlus(stats.articles), label: "Articles" },
      { value: formatPlus(stats.produits), label: "Produits" },
      { value: formatPlus(stats.videos), label: "Videos" },
    ],
    [stats],
  );

  const chooseAnotherVideo = () => {
    if (videoPool.length <= 1) return;
    const currentId = selectedVideo?.id;
    const candidates = videoPool.filter((video) => video.id !== currentId);
    const randomIndex = Math.floor(Math.random() * candidates.length);
    setSelectedVideo(candidates[randomIndex] || videoPool[0]);
    setPlaying(false);
  };

  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      <div className="absolute inset-0 z-0">
        <Image
          src="https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=1920&q=80"
          alt="Industrie moderne"
          fill
          className="object-cover"
          priority
        />
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/95 via-slate-950/80 to-slate-950/60" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-slate-950/30" />
      </div>

      <div className="absolute inset-0 z-[1] overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, x: -100 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 1.2, delay: 0.5 }}
          className="absolute top-1/4 left-0 w-32 h-[1px] bg-gradient-to-r from-amber-400/60 to-transparent"
        />
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.2, delay: 0.7 }}
          className="absolute top-0 left-1/4 w-[1px] h-32 bg-gradient-to-b from-amber-400/60 to-transparent"
        />
        <div
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(251, 191, 36, 0.3) 1px, transparent 1px),
                            linear-gradient(90deg, rgba(251, 191, 36, 0.3) 1px, transparent 1px)`,
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-32 lg:py-40">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
            className="text-left"
          >
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.6 }}
              className="inline-flex items-center gap-3 px-5 py-2.5 rounded-full border border-amber-400/30 bg-amber-400/5 backdrop-blur-sm mb-8"
            >
              <Award className="h-4 w-4 text-amber-400" />
              <span className="text-amber-200 text-sm font-medium tracking-wide uppercase">
                Excellence Industrielle
              </span>
            </motion.div>

            <h1 className="font-[family-name:var(--font-playfair)] text-5xl sm:text-6xl lg:text-7xl font-semibold text-white mb-6 leading-[1.1] tracking-tight">
              Maitrisez
              <br />
              <span className="text-amber-400">l&apos;Industrie</span>
              <br />
              de Demain
            </h1>

            <p className="text-lg sm:text-xl text-slate-300 max-w-xl mb-10 leading-relaxed font-light">
              Formations professionnelles certifiees, ressources techniques
              exclusives et produits industriels d&apos;excellence pour les
              leaders de l&apos;industrie moderne.
            </p>

            <div className="flex flex-col sm:flex-row items-start gap-4 mb-12">
              <Link href="/formations">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    className="bg-amber-500 hover:bg-amber-400 text-slate-950 px-8 py-6 text-base font-semibold rounded-sm transition-all shadow-lg shadow-amber-500/20 hover:shadow-amber-500/40 group"
                  >
                    <BookOpen className="h-5 w-5 mr-2" />
                    Explorer les formations
                    <ArrowRight className="h-5 w-5 ml-2 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </motion.div>
              </Link>
              <Link href="/boutique">
                <motion.div
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-8 py-6 text-base font-medium rounded-sm border-slate-400/30 text-white hover:bg-white/5 hover:border-slate-300/50 backdrop-blur-sm transition-all"
                  >
                    <ShoppingBag className="h-5 w-5 mr-2" />
                    Boutique professionnelle
                  </Button>
                </motion.div>
              </Link>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.6 }}
              className="flex flex-wrap gap-8 lg:gap-12"
            >
              {statItems.map((stat, index) => (
                <motion.div
                  key={stat.label}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.7 + index * 0.1, duration: 0.5 }}
                  className="text-left"
                >
                  <div className="flex items-baseline gap-1">
                    <span className="font-[family-name:var(--font-playfair)] text-3xl sm:text-4xl font-semibold text-amber-400">
                      {stat.value}
                    </span>
                  </div>
                  <div className="text-sm text-slate-400 uppercase tracking-wider mt-1">
                    {stat.label}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              duration: 0.8,
              delay: 0.4,
              ease: [0.25, 0.1, 0.25, 1],
            }}
            className="w-full"
          >
            <div className="relative">
              <div className="absolute -inset-4 border border-amber-400/20 rounded-lg" />
              <div className="absolute -inset-8 border border-amber-400/10 rounded-lg" />

              <div className="relative bg-slate-900/80 backdrop-blur-md rounded-lg border border-slate-700/50 p-8 shadow-2xl">
                <div className="flex items-center justify-between gap-4 mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <PlayCircle className="h-6 w-6 text-amber-400" />
                    </div>
                    <div>
                      <h3 className="font-[family-name:var(--font-playfair)] text-xl text-white font-medium">
                        Video selection du jour
                      </h3>
                      <p className="text-slate-400 text-sm">
                        Une video choisie au hasard a chaque rafraichissement
                      </p>
                    </div>
                  </div>
                  {videoPool.length > 1 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="border-slate-500/50 text-slate-200 hover:bg-white/10"
                      onClick={chooseAnotherVideo}
                    >
                      Changer
                    </Button>
                  )}
                </div>

                <div className="relative aspect-video rounded-md overflow-hidden bg-slate-800 group">
                  {playing ? (
                    embedUrl ? (
                      <iframe
                        src={embedUrl}
                        className="h-full w-full pointer-events-none"
                        allow="autoplay; encrypted-media"
                        frameBorder="0"
                      />
                    ) : selectedVideo?.video_type === "upload" &&
                      selectedVideo.video_url ? (
                      <video
                        src={selectedVideo.video_url}
                        className="h-full w-full object-cover pointer-events-none"
                        autoPlay
                        playsInline
                        onTimeUpdate={(event) => {
                          if (event.currentTarget.currentTime >= 30) {
                            setPlaying(false);
                          }
                        }}
                      />
                    ) : (
                      <Image
                        src={previewImage}
                        alt={selectedVideo?.title || "Video selectionnee"}
                        fill
                        className="object-cover"
                      />
                    )
                  ) : (
                    <>
                      <Image
                        src={previewImage}
                        alt={selectedVideo?.title || "Video selectionnee"}
                        fill
                        className="object-cover opacity-75 group-hover:opacity-90 group-hover:scale-105 transition-all duration-500"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent" />
                      <button
                        type="button"
                        onClick={() => setPlaying(true)}
                        className="absolute inset-0 flex items-center justify-center"
                        aria-label="Lire la video dans le hero"
                      >
                        <div className="w-16 h-16 rounded-full bg-amber-500/90 flex items-center justify-center group-hover:bg-amber-400 transition-colors shadow-lg shadow-amber-500/30">
                          <PlayCircle className="h-8 w-8 text-slate-950 ml-1" />
                        </div>
                      </button>
                    </>
                  )}
                </div>

                <div className="mt-5 space-y-3">
                  <h4 className="text-white font-medium line-clamp-1">
                    {selectedVideo?.title || "Chargement de la video..."}
                  </h4>
                  {selectedVideo?.description && (
                    <p className="text-sm text-slate-300 line-clamp-2">
                      {selectedVideo.description}
                    </p>
                  )}
                  <div className="flex items-center gap-3">
                    {!playing ? (
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => setPlaying(true)}
                        className="bg-amber-500 text-slate-950 hover:bg-amber-400"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Lire ici
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="border-slate-500/50 text-slate-200 hover:bg-white/10"
                        onClick={() => setPlaying(false)}
                      >
                        <PauseCircle className="h-4 w-4 mr-2" />
                        Arreter
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 z-10"
      >
        <motion.div
          animate={{ y: [0, 8, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="flex flex-col items-center gap-2 text-slate-400 hover:text-amber-400 transition-colors cursor-pointer"
        >
          <span className="text-xs uppercase tracking-widest">Decouvrir</span>
          <ChevronDown className="h-5 w-5" />
        </motion.div>
      </motion.div>
    </section>
  );
}
