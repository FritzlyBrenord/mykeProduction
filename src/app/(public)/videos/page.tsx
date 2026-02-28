"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Filter, Sparkles, PlayCircle } from "lucide-react";
import { Video } from "@/lib/types";
import VideoCard from "@/components/cards/VideoCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

const mockVideos: Video[] = [
  {
    id: "1",
    title: "Tutoriel : Analyse chimique par spectroscopie",
    slug: "tutoriel-analyse-spectroscopie",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_type: "youtube",
    access_type: "public",
    price: 0,
    status: "published",
    view_count: 3420,
    thumbnail_url:
      "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
    description:
      "Apprenez les bases de la spectroscopie et son utilisation en analyse chimique.",
    created_at: "2024-02-18",
  },
  {
    id: "2",
    title: "Documentaire : Les géants de l'industrie chimique",
    slug: "documentaire-geants-industrie-chimique",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_type: "youtube",
    access_type: "members",
    price: 0,
    status: "published",
    view_count: 1890,
    thumbnail_url:
      "https://images.unsplash.com/photo-1565514020176-db9e1b95da24?w=800",
    description: "Plongée au cœur des plus grandes usines chimiques du monde.",
    created_at: "2024-02-12",
  },
  {
    id: "3",
    title: "Formation avancée : Synthèse organique",
    slug: "formation-synthese-organique",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_type: "youtube",
    access_type: "paid",
    price: 49.9,
    status: "published",
    view_count: 567,
    thumbnail_url:
      "https://images.unsplash.com/photo-1603126857599-f6e157fa2fe6?w=800",
    description:
      "Formation complète sur les techniques de synthèse organique moderne.",
    created_at: "2024-02-08",
  },
  {
    id: "4",
    title: "Sécurité en laboratoire : bonnes pratiques",
    slug: "securite-laboratoire",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_type: "youtube",
    access_type: "public",
    price: 0,
    status: "published",
    view_count: 5230,
    thumbnail_url:
      "https://images.unsplash.com/photo-1583947581924-860bda6a26df?w=800",
    description:
      "Guide complet des procédures de sécurité en laboratoire chimique.",
    created_at: "2024-02-01",
  },
  {
    id: "5",
    title: "Masterclass : Gestion de projet industriel",
    slug: "masterclass-gestion-projet",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_type: "youtube",
    access_type: "members",
    price: 0,
    status: "published",
    view_count: 1234,
    thumbnail_url:
      "https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=800",
    description: "Apprenez à gérer des projets industriels complexes de A à Z.",
    created_at: "2024-01-25",
  },
  {
    id: "6",
    title: "Cours complet : Thermodynamique industrielle",
    slug: "cours-thermodynamique",
    video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    video_type: "youtube",
    access_type: "paid",
    price: 79.9,
    status: "published",
    view_count: 890,
    thumbnail_url:
      "https://images.unsplash.com/photo-1581091226825-a6a2a5aee158?w=800",
    description:
      "Cours complet sur les principes de la thermodynamique appliquée à l'industrie.",
    created_at: "2024-01-20",
  },
];

const accessTypes = [
  { value: "all", label: "Tous" },
  { value: "public", label: "Gratuit" },
  { value: "members", label: "Membres" },
  { value: "paid", label: "Payant" },
];

export default function VideosPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedAccess, setSelectedAccess] = useState("all");

  const filteredVideos = mockVideos.filter((video) => {
    const matchesSearch =
      video.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      video.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesAccess =
      selectedAccess === "all" || video.access_type === selectedAccess;
    return matchesSearch && matchesAccess;
  });

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
                Vidéothèque
              </span>
            </div>
            <h1 className="font-[family-name:var(--font-playfair)] text-4xl lg:text-5xl font-semibold text-slate-900">
              Nos vidéos
            </h1>
            <p className="text-slate-600 mt-3 max-w-2xl text-lg">
              Tutoriels, documentaires et formations vidéo pour approfondir vos
              connaissances.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Filters & Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Rechercher une vidéo..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {accessTypes.map((type) => (
              <Button
                key={type.value}
                variant={selectedAccess === type.value ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedAccess(type.value)}
                className="whitespace-nowrap"
              >
                {type.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Results */}
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVideos.map((video, index) => (
              <VideoCard key={video.id} video={video} index={index} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Sparkles className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="font-[family-name:var(--font-playfair)] text-lg font-medium text-slate-900 mb-2">
              Aucune vidéo trouvée
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
