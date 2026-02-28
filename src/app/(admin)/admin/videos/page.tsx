"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Plus,
  Search,
  Video,
  Play,
  Edit,
  Trash2,
  Upload,
  Youtube,
  Lock,
  X,
  MoreHorizontal,
  Calendar,
  Users,
  Globe,
  BarChart3,
  AlertCircle,
  Loader,
  ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { VideoFormModal } from "@/components/admin/VideoFormModal";
import { DeleteConfirmModal } from "@/components/admin/DeleteConfirmModal";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusLabel,
} from "@/lib/utils";
import { useVideos } from "@/hooks/useVideos";
import { cn } from "@/lib/utils";
import { Video as VideoType } from "@/types";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0 },
};

const accessTypeConfig = {
  public: {
    label: "Public",
    icon: Globe,
    color: "text-green-500 bg-green-500/10",
  },
  members: {
    label: "Membres",
    icon: Users,
    color: "text-blue-500 bg-blue-500/10",
  },
  paid: {
    label: "Payant",
    icon: Lock,
    color: "text-amber-500 bg-amber-500/10",
  },
};

const videoTypeConfig = {
  upload: { label: "Upload", icon: Upload },
  youtube: { label: "YouTube", icon: Youtube },
  vimeo: { label: "Vimeo", icon: Video },
};

export default function VideosPage() {
  const {
    videos,
    loading,
    error,
    fetchVideos,
    createVideo,
    updateVideo,
    deleteVideo,
    changeStatus,
  } = useVideos();
  const [search, setSearch] = useState("");
  const [accessFilter, setAccessFilter] = useState<string>("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [selectedVideo, setSelectedVideo] = useState<VideoType | undefined>();
  const [videoToDelete, setVideoToDelete] = useState<VideoType | undefined>();
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [showStatusMenu, setShowStatusMenu] = useState<string | null>(null);

  // CORRECTION : State pour gérer quelle vidéo est en lecture (par ID)
  const [playingVideoId, setPlayingVideoId] = useState<string | null>(null);

  // Fetch videos on mount
  useEffect(() => {
    fetchVideos();
  }, []);

  const filteredVideos = videos.filter((v) => {
    if (accessFilter && v.access_type !== accessFilter) return false;
    if (statusFilter && v.status !== statusFilter) return false;
    if (search && !v.title.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const stats = {
    total: videos.length,
    public: videos.filter((v) => v.access_type === "public").length,
    members: videos.filter((v) => v.access_type === "members").length,
    paid: videos.filter((v) => v.access_type === "paid").length,
    draft: videos.filter((v) => v.status === "draft").length,
    totalViews: videos.reduce((acc, v) => acc + v.view_count, 0),
  };

  const handleAddVideo = () => {
    setSelectedVideo(undefined);
    setIsFormOpen(true);
  };

  const handleEditVideo = (video: VideoType) => {
    setSelectedVideo(video);
    setIsFormOpen(true);
  };

  const handleDeleteVideo = (video: VideoType) => {
    setVideoToDelete(video);
    setIsDeleteOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (videoToDelete) {
      await deleteVideo(videoToDelete.id);
      setVideoToDelete(undefined);
    }
  };

  const handleFormSubmit = async (formData: Partial<VideoType>) => {
    if (selectedVideo) {
      await updateVideo(selectedVideo.id, formData);
    } else {
      await createVideo(
        formData as Omit<VideoType, "id" | "created_at" | "view_count">,
      );
    }
  };

  const handleChangeStatus = async (
    video: VideoType,
    status: "published" | "draft" | "archived",
  ) => {
    await changeStatus(video.id, status);
    setShowStatusMenu(null);
  };

  // CORRECTION : Fonction pour toggle play/stop d'une vidéo spécifique
  const togglePlay = (videoId: string) => {
    setPlayingVideoId(playingVideoId === videoId ? null : videoId);
  };

  // CORRECTION : Fonction pour arrêter toute lecture
  const stopVideo = () => {
    setPlayingVideoId(null);
  };

  return (
    <div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <div
        variants={itemVariants}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Vidéos
          </h1>
          <p className="text-[var(--muted)] mt-1">Gérez votre vidéothèque</p>
        </div>
        <Button onClick={handleAddVideo} className="gap-2">
          <Plus className="w-4 h-4" />
          Nouvelle vidéo
        </Button>
      </div>

      {/* Error Alert */}
      {error && (
        <div
          variants={itemVariants}
          className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 flex gap-3"
        >
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-red-500">Erreur</p>
            <p className="text-sm text-red-400">{error}</p>
          </div>
        </div>
      )}

      {/* Stats */}
      <div
        variants={itemVariants}
        className="grid grid-cols-2 md:grid-cols-6 gap-4"
      >
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Total vidéos</p>
          <p className="text-2xl font-bold text-[var(--foreground)]">
            {stats.total}
          </p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Public</p>
          <p className="text-2xl font-bold text-green-500">{stats.public}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Membres</p>
          <p className="text-2xl font-bold text-blue-500">{stats.members}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Payant</p>
          <p className="text-2xl font-bold text-amber-500">{stats.paid}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Brouillon</p>
          <p className="text-2xl font-bold text-orange-500">{stats.draft}</p>
        </div>
        <div className="bg-[var(--card)] rounded-xl p-4 border border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">Vues totales</p>
          <p className="text-2xl font-bold text-[var(--primary)]">
            {stats.totalViews.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Filters */}
      <div variants={itemVariants} className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher une vidéo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <select
          value={accessFilter}
          onChange={(e) => setAccessFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les accès</option>
          <option value="public">Public</option>
          <option value="members">Membres</option>
          <option value="paid">Payant</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
        >
          <option value="">Tous les statuts</option>
          <option value="published">Publié</option>
          <option value="draft">Brouillon</option>
          <option value="archived">Archivé</option>
        </select>
      </div>

      {/* Loading State */}
      {loading && videos.length === 0 && (
        <div
          variants={itemVariants}
          className="flex items-center justify-center py-16"
        >
          <div className="text-center">
            <div className="inline-flex p-4 bg-[var(--primary)]/10 rounded-full mb-4">
              <Loader className="w-8 h-8 text-[var(--primary)] animate-spin" />
            </div>
            <p className="text-[var(--foreground)] font-medium">
              Chargement des vidéos...
            </p>
            <p className="text-sm text-[var(--muted)] mt-1">
              Veuillez patienter
            </p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div
          variants={itemVariants}
          className="bg-red-500/10 border border-red-500/30 rounded-xl p-6"
        >
          <div className="flex gap-4">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium text-red-500 mb-1">
                Erreur lors du chargement
              </p>
              <p className="text-sm text-red-400">{error}</p>
              <button
                onClick={() => fetchVideos()}
                className="mt-3 text-sm font-medium text-red-500 hover:text-red-600 underline"
              >
                Réessayer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && videos.length === 0 && (
        <div
          variants={itemVariants}
          className="flex items-center justify-center py-16"
        >
          <div className="text-center max-w-sm">
            <div className="inline-flex p-4 bg-[var(--primary)]/10 rounded-full mb-4">
              <Video className="w-8 h-8 text-[var(--primary)]" />
            </div>
            <p className="text-[var(--foreground)] font-medium text-lg mb-2">
              Aucune vidéo
            </p>
            <p className="text-sm text-[var(--muted)] mb-6">
              Commencez par créer votre première vidéo pour que votre
              vidéothèque s'enrichisse.
            </p>
            <Button onClick={handleAddVideo} className="gap-2" size="sm">
              <Plus className="w-4 h-4" />
              Créer la première vidéo
            </Button>
          </div>
        </div>
      )}

      {/* No Results State */}
      {!loading &&
        !error &&
        videos.length > 0 &&
        filteredVideos.length === 0 && (
          <div
            variants={itemVariants}
            className="flex items-center justify-center py-16"
          >
            <div className="text-center max-w-sm">
              <div className="inline-flex p-4 bg-[var(--muted)]/10 rounded-full mb-4">
                <Search className="w-8 h-8 text-[var(--muted)]" />
              </div>
              <p className="text-[var(--foreground)] font-medium text-lg mb-2">
                Aucun résultat
              </p>
              <p className="text-sm text-[var(--muted)]">
                Aucune vidéo ne correspond à vos filtres. Essayez de modifier
                votre recherche ou vos filtres.
              </p>
            </div>
          </div>
        )}

      {/* Videos Grid */}
      {!loading && filteredVideos.length > 0 && (
        <>
          <div
            variants={itemVariants}
            className="flex items-center justify-between"
          >
            <p className="text-sm text-[var(--muted)]">
              {filteredVideos.length} vidéo
              {filteredVideos.length > 1 ? "s" : ""} trouvée
              {filteredVideos.length > 1 ? "s" : ""}
            </p>
          </div>

          <div
            variants={itemVariants}
            className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
          >
            {filteredVideos.map((video) => {
              const accessConfig =
                accessTypeConfig[
                  video.access_type as keyof typeof accessTypeConfig
                ];
              const AccessIcon = accessConfig.icon;
              const videoType =
                videoTypeConfig[
                  video.video_type as keyof typeof videoTypeConfig
                ];
              const VideoTypeIcon = videoType.icon;

              // Extract YouTube/Vimeo IDs
              const youtubeId =
                video.video_type === "youtube" && video.video_url
                  ? video.video_url.match(
                      /(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\n?#]+)/,
                    )?.[1]
                  : null;
              const vimeoId =
                video.video_type === "vimeo" && video.video_url
                  ? video.video_url.match(/vimeo\.com\/(\d+)/)?.[1]
                  : null;

              // CORRECTION : Vérifier si CETTE vidéo spécifique est en lecture
              const isThisVideoPlaying = playingVideoId === video.id;

              return (
                <div
                  key={video.id}
                  variants={itemVariants}
                  className="bg-[var(--card)] rounded-xl border border-[var(--border)] overflow-hidden group hover:shadow-2xl hover:shadow-[var(--primary)]/5 transition-all duration-500"
                >
                  {/* Video Container Premium */}
                  <div className="relative aspect-video bg-black overflow-hidden">
                    {/* CORRECTION : Condition basée sur l'ID de la vidéo spécifique */}
                    {!isThisVideoPlaying ? (
                      <div
                        className="relative w-full h-full cursor-pointer group/video"
                        onClick={() => togglePlay(video.id)}
                      >
                        {/* Gradient Background comme fallback ou thumbnail */}
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--primary-dark)]/30" />

                        {/* Icon vidéo centrée */}
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-20 h-20 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 flex items-center justify-center group-hover/video:scale-110 transition-transform duration-300">
                            <Play className="w-8 h-8 text-white fill-white ml-1" />
                          </div>
                        </div>

                        {/* Overlay gradient subtil */}
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />
                      </div>
                    ) : (
                      /* Lecteur Vidéo Actif */
                      <div className="relative w-full h-full">
                        {video.video_type === "youtube" && youtubeId ? (
                          <iframe
                            src={`https://www.youtube.com/embed/${youtubeId}?autoplay=1&rel=0&modestbranding=1`}
                            className="w-full h-full"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                          />
                        ) : video.video_type === "vimeo" && vimeoId ? (
                          <iframe
                            src={`https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`}
                            className="w-full h-full"
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            frameBorder="0"
                          />
                        ) : video.video_url ? (
                          <video
                            autoPlay
                            controls
                            controlsList="nodownload"
                            className="w-full h-full object-contain"
                            src={video.video_url}
                            onEnded={() => stopVideo()}
                          >
                            Votre navigateur ne supporte pas la lecture vidéo.
                          </video>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-dark)]/20">
                            <Video className="w-16 h-16 text-[var(--primary)]/40" />
                          </div>
                        )}

                        {/* Bouton Fermer pour arrêter la vidéo */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            stopVideo();
                          }}
                          className="absolute top-3 right-3 z-20 p-2 bg-black/50 hover:bg-black/70 backdrop-blur-md rounded-lg text-white transition-all opacity-0 group-hover:opacity-100"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    )}

                    {/* Badges Positionnés - Design épuré */}
                    <div className="absolute top-3 left-3 flex flex-col gap-2 pointer-events-none">
                      <span
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-semibold backdrop-blur-md border shadow-lg",
                          accessConfig.color,
                        )}
                      >
                        <AccessIcon className="w-3.5 h-3.5 inline mr-1.5" />
                        {accessConfig.label}
                      </span>
                      <span className="px-3 py-1.5 rounded-lg text-xs font-medium bg-[var(--card)]/95 text-[var(--foreground)] backdrop-blur-md border border-[var(--border)] shadow-lg flex items-center gap-1.5">
                        <VideoTypeIcon className="w-3.5 h-3.5" />
                        {videoType.label}
                      </span>
                    </div>

                    {/* Status Badge - Bottom Left */}
                    <div className="absolute bottom-3 left-3 pointer-events-none">
                      <span
                        className={cn(
                          "px-3 py-1.5 rounded-lg text-xs font-medium backdrop-blur-md border shadow-lg",
                          getStatusColor(video.status),
                        )}
                      >
                        {getStatusLabel(video.status)}
                      </span>
                    </div>

                    {/* Menu Actions - Apparition élégante */}
                    <div className="absolute top-3 right-3 flex flex-col gap-2 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-x-2 group-hover:translate-x-0">
                      {/* Status Dropdown */}
                      <div className="relative">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowStatusMenu(
                              showStatusMenu === video.id ? null : video.id,
                            );
                          }}
                          className="p-2.5 bg-[var(--card)]/95 hover:bg-[var(--card)] border border-[var(--border)] rounded-lg shadow-lg transition-all hover:scale-105"
                          title="Changer le statut"
                        >
                          <MoreHorizontal className="w-4 h-4 text-[var(--foreground)]" />
                        </button>

                        {showStatusMenu === video.id && (
                          <div
                            initial={{ opacity: 0, scale: 0.95, y: -10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: -10 }}
                            className="absolute right-0 mt-2 w-40 bg-[var(--card)] border border-[var(--border)] rounded-xl shadow-2xl z-50 overflow-hidden"
                          >
                            <div className="p-1.5 space-y-0.5">
                              <button
                                onClick={() =>
                                  handleChangeStatus(video, "published")
                                }
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--primary)]/10 transition-colors text-sm text-[var(--foreground)] flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-green-500" />
                                Publié
                              </button>
                              <button
                                onClick={() =>
                                  handleChangeStatus(video, "draft")
                                }
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--primary)]/10 transition-colors text-sm text-[var(--foreground)] flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-amber-500" />
                                Brouillon
                              </button>
                              <button
                                onClick={() =>
                                  handleChangeStatus(video, "archived")
                                }
                                className="w-full text-left px-3 py-2 rounded-lg hover:bg-[var(--primary)]/10 transition-colors text-sm text-[var(--foreground)] flex items-center gap-2"
                              >
                                <span className="w-2 h-2 rounded-full bg-gray-500" />
                                Archivé
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Edit Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEditVideo(video);
                        }}
                        className="p-2.5 bg-[var(--card)]/95 hover:bg-[var(--primary)] border border-[var(--border)] hover:border-[var(--primary)] rounded-lg shadow-lg transition-all hover:scale-105 group/edit"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4 text-[var(--foreground)] group-hover/edit:text-white transition-colors" />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteVideo(video);
                        }}
                        className="p-2.5 bg-[var(--card)]/95 hover:bg-red-500 border border-[var(--border)] hover:border-red-500 rounded-lg shadow-lg transition-all hover:scale-105 group/delete"
                        title="Supprimer"
                      >
                        <Trash2 className="w-4 h-4 text-[var(--foreground)] group-hover/delete:text-white transition-colors" />
                      </button>
                    </div>
                  </div>

                  {/* Content Section - Layout vertical premium */}
                  <div className="p-5 space-y-4">
                    {/* Header avec titre et prix */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-[var(--foreground)] text-lg leading-tight line-clamp-2 group-hover:text-[var(--primary)] transition-colors">
                        {video.title}
                      </h3>
                      <p className="text-xs text-[var(--muted)] font-mono">
                        {video.slug}
                      </p>
                    </div>

                    {/* Métadonnées en ligne */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md bg-[var(--input)] text-[var(--foreground)] text-xs font-medium">
                          {videoType.label}
                        </span>
                        {video.access_type === "paid" && (
                          <span className="px-2.5 py-1 rounded-md bg-amber-500/10 text-amber-600 text-xs font-bold border border-amber-500/20">
                            {formatPrice(video.price)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Stats Footer avec séparation élégante */}
                    <div className="pt-4 border-t border-[var(--border)] flex items-center justify-between text-sm">
                      <div className="flex items-center gap-4">
                        <div className="flex items-center gap-1.5 text-[var(--muted)]">
                          <BarChart3 className="w-4 h-4" />
                          <span className="font-medium">
                            {video.view_count.toLocaleString()}
                          </span>
                          <span className="text-xs">vues</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-[var(--muted)]">
                          <Calendar className="w-4 h-4" />
                          <span className="text-xs">
                            {formatDate(video.created_at)}
                          </span>
                        </div>
                      </div>

                      {/* CORRECTION : Indicateur de lecture si CETTE vidéo est active */}
                      {isThisVideoPlaying && (
                        <div className="flex items-center gap-2 text-[var(--primary)]">
                          <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--primary)] opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--primary)]"></span>
                          </span>
                          <span className="text-xs font-medium">
                            Lecture en cours
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
      {/* Modals */}
      <VideoFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        video={selectedVideo}
        isLoading={loading}
      />

      <DeleteConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleConfirmDelete}
        title={videoToDelete?.title || ""}
        isLoading={loading}
      />
    </div>
  );
}
