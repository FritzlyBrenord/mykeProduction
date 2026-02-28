"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Eye,
  Clock,
  Share2,
  ThumbsUp,
  MessageCircle,
  Lock,
  ShoppingCart,
  CheckCircle,
} from "lucide-react";
import { Video } from "@/lib/types";
import { formatPrice } from "@/lib/utils/format";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useAuth } from "@/lib/hooks/useAuth";

const mockVideo: Video = {
  id: "1",
  title: "Tutoriel : Analyse chimique par spectroscopie",
  slug: "tutoriel-analyse-spectroscopie",
  video_url: "https://www.youtube.com/embed/dQw4w9WgXcQ",
  video_type: "youtube",
  access_type: "public",
  price: 0,
  status: "published",
  view_count: 3420,
  thumbnail_url:
    "https://images.unsplash.com/photo-1532094349884-543bc11b234d?w=800",
  description:
    "Dans ce tutoriel complet, nous explorerons les principes fondamentaux de la spectroscopie et son application pratique en analyse chimique. Vous apprendrez à interpréter les spectres et à utiliser différents types de spectroscopes.",
  created_at: "2024-02-18",
};

const relatedVideos: Video[] = [
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
    description: "Guide complet des procédures de sécurité.",
    created_at: "2024-02-01",
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
    description: "Formation complète sur les techniques de synthèse.",
    created_at: "2024-02-08",
  },
];

export default function VideoDetailPage() {
  const { user } = useAuth();
  const [hasAccess, setHasAccess] = useState(
    mockVideo.access_type === "public",
  );
  const video = mockVideo;

  const handlePurchase = () => {
    if (!user) {
      toast.error("Vous devez être connecté pour acheter cette vidéo");
      return;
    }
    toast.success("Vidéo ajoutée au panier");
  };

  const handleUnlock = () => {
    if (!user) {
      toast.error("Vous devez être connecté pour accéder à cette vidéo");
      return;
    }
    setHasAccess(true);
    toast.success("Accès débloqué !");
  };

  const getAccessBadge = () => {
    switch (video.access_type) {
      case "public":
        return <Badge className="bg-green-500">Gratuit</Badge>;
      case "members":
        return <Badge className="bg-amber-500">Membres</Badge>;
      case "paid":
        return (
          <Badge className="bg-amber-500">{formatPrice(video.price)}</Badge>
        );
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Breadcrumb */}
      <div className="bg-white border-b pt-20 pb-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Link
            href="/videos"
            className="inline-flex items-center text-sm text-slate-500 hover:text-amber-600 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Retour aux vidéos
          </Link>
        </div>
      </div>

      {/* Video Player Section */}
      <div className="bg-black">
        <div className="max-w-5xl mx-auto">
          {hasAccess ? (
            <div className="relative aspect-video">
              <iframe
                src={video.video_url}
                title={video.title}
                className="w-full h-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              />
            </div>
          ) : (
            <div className="relative aspect-video flex items-center justify-center bg-gradient-to-br from-slate-800 to-slate-900">
              <div className="text-center p-8">
                <Lock className="h-16 w-16 text-slate-400 mx-auto mb-4" />
                <h2 className="text-2xl font-bold text-white mb-2">
                  Contenu réservé
                </h2>
                <p className="text-slate-400 mb-6 max-w-md">
                  {video.access_type === "members"
                    ? "Devenez membre pour accéder à cette vidéo exclusive."
                    : "Achetez cette vidéo pour y accéder en illimité."}
                </p>
                <div className="flex gap-4 justify-center">
                  {video.access_type === "paid" && (
                    <Button
                      className="bg-slate-900 hover:bg-amber-500 hover:text-slate-950"
                      onClick={handlePurchase}
                    >
                      <ShoppingCart className="h-4 w-4 mr-2" />
                      Acheter {formatPrice(video.price)}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="border-white text-white hover:bg-white/10"
                    onClick={handleUnlock}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {video.access_type === "members"
                      ? "Devenir membre"
                      : "Acheter maintenant"}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Video Info */}
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {/* Title & Badges */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                {getAccessBadge()}
                <Badge variant="secondary">{video.video_type}</Badge>
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-slate-900">
                {video.title}
              </h1>
            </div>
          </div>

          {/* Stats */}
          <div className="flex flex-wrap items-center gap-6 text-sm text-slate-500 mb-6">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {video.view_count.toLocaleString()} vues
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Publié le {new Date(video.created_at).toLocaleDateString("fr-FR")}
            </span>
          </div>

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 mb-8">
            <Button variant="outline" size="sm">
              <ThumbsUp className="h-4 w-4 mr-2" />
              J'aime
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Partager
            </Button>
            <Button variant="outline" size="sm">
              <MessageCircle className="h-4 w-4 mr-2" />
              Commenter
            </Button>
          </div>

          {/* Description */}
          <Card className="mb-8">
            <CardContent className="p-6">
              <h2 className="text-lg font-semibold text-slate-900 mb-3">
                Description
              </h2>
              <p className="text-slate-600 leading-relaxed">
                {video.description}
              </p>
            </CardContent>
          </Card>

          {/* Related Videos */}
          <div>
            <h2 className="text-xl font-bold text-slate-900 mb-4">
              Vidéos similaires
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {relatedVideos.map((relatedVideo, index) => (
                <Link
                  key={relatedVideo.id}
                  href={`/videos/${relatedVideo.slug}`}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <div className="relative aspect-video">
                      <img
                        src={
                          relatedVideo.thumbnail_url ||
                          "/images/placeholder-video.jpg"
                        }
                        alt={relatedVideo.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
                        <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                          <div className="w-0 h-0 border-t-6 border-b-6 border-l-8 border-transparent border-l-slate-800 ml-1" />
                        </div>
                      </div>
                      {relatedVideo.access_type === "public" && (
                        <Badge className="absolute top-2 left-2 bg-green-500">
                          Gratuit
                        </Badge>
                      )}
                      {relatedVideo.access_type === "paid" && (
                        <Badge className="absolute top-2 left-2 bg-amber-500">
                          {formatPrice(relatedVideo.price)}
                        </Badge>
                      )}
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 line-clamp-2">
                        {relatedVideo.title}
                      </h3>
                      <p className="text-sm text-slate-500 mt-1">
                        {relatedVideo.view_count.toLocaleString()} vues
                      </p>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
