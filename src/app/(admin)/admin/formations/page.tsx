"use client";

import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Archive,
  BookOpen,
  Video,
  Users,
  Star,
  X,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useFormations, useDeleteFormation } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusLabel,
  truncateText,
} from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatUTCDateInTimeZone } from "@/lib/timezone";

// Video preview component
function yt(url: string): string | null {
  const m1 = url.match(/youtu\.be\/([A-Za-z0-9_-]{6,})/);
  if (m1) return m1[1];
  const m2 = url.match(/[?&]v=([A-Za-z0-9_-]{6,})/);
  if (m2) return m2[1];
  return null;
}

function vm(url: string): string | null {
  const m = url.match(/vimeo\.com\/(\d+)/);
  return m ? m[1] : null;
}

type VideoType = "upload" | "youtube" | "vimeo" | null;

function Preview({ type, url }: { type: VideoType; url: string | null }) {
  if (!url) return null;
  if (type === "upload")
    return (
      <video
        controls
        className="w-full rounded-xl border border-[var(--border)] bg-black"
        src={url}
      />
    );
  if (type === "youtube") {
    const id = yt(url);
    return id ? (
      <iframe
        className="w-full aspect-video rounded-xl border border-[var(--border)]"
        src={`https://www.youtube.com/embed/${id}`}
        allowFullScreen
      />
    ) : (
      <p className="text-xs text-red-500">URL YouTube invalide</p>
    );
  }
  if (type === "vimeo") {
    const id = vm(url);
    return id ? (
      <iframe
        className="w-full aspect-video rounded-xl border border-[var(--border)]"
        src={`https://player.vimeo.com/video/${id}`}
        allowFullScreen
      />
    ) : (
      <p className="text-xs text-red-500">URL Vimeo invalide</p>
    );
  }
  return null;
}

export default function FormationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<string>("");
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(
    null,
  );

  const params = useMemo(
    () => ({
      status: statusFilter || undefined,
      search: search || undefined,
    }),
    [statusFilter, search],
  );

  const { data: formations, isLoading, isError, error, refetch } =
    useFormations(params);

  const deleteMutation = useDeleteFormation();
  const publishingNowRef = useRef(false);

  const handleDelete = async (id: string) => {
    if (confirm("Êtes-vous sûr de vouloir archiver cette formation ?")) {
      deleteMutation.mutate(id);
    }
  };

  const filteredFormations = (formations || []).filter((f: any) => {
    if (formatFilter && f.format !== formatFilter) return false;
    return true;
  });

  const handleScheduledReady = useCallback(async () => {
    if (publishingNowRef.current) return;
    publishingNowRef.current = true;

    try {
      const response = await fetch("/api/admin/formations/publish-now", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      if (!response.ok) return;

      const payload = (await response.json()) as { count?: number };
      if ((payload.count ?? 0) > 0) {
        await refetch();
      }
    } catch (error) {
      console.error("Auto publication check failed:", error);
    } finally {
      publishingNowRef.current = false;
    }
  }, [refetch]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">
            Formations
          </h1>
          <p className="text-[var(--muted)] mt-1">
            Gérez vos formations et leur contenu
          </p>
        </div>
        <Link href="/admin/formations/nouvelle">
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Nouvelle formation
          </Button>
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted)]" />
          <input
            type="text"
            placeholder="Rechercher une formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Tous les statuts</option>
            <option value="draft">Brouillon</option>
            <option value="published">Publié</option>
            <option value="scheduled">Planifiée</option>
            <option value="archived">Archivé</option>
          </select>
          <select
            value={formatFilter}
            onChange={(e) => setFormatFilter(e.target.value)}
            className="px-4 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            <option value="">Tous les formats</option>
            <option value="video">Vidéo</option>
            <option value="text">Texte</option>
          </select>
        </div>
      </div>

      {/* Formations Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary)]" />
        </div>
      ) : isError ? (
        <div className="text-center py-12 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">
            Impossible de charger les formations
          </h3>
          <p className="text-sm text-red-500 mb-4">
            {(error as Error)?.message || "Erreur inconnue"}
          </p>
          <Button onClick={() => window.location.reload()}>RÃ©essayer</Button>
        </div>
      ) : filteredFormations.length === 0 ? (
        <div className="text-center py-16">
          <BookOpen className="w-16 h-16 text-[var(--muted)] mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-[var(--foreground)] mb-2">
            Aucune formation
          </h3>
          <p className="text-[var(--muted)] mb-6">
            Commencez par créer votre première formation
          </p>
          <Link href="/admin/formations/nouvelle">
            <Button>Créer une formation</Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredFormations.map((formation: any) => (
            <FormationCard
              key={formation.id}
              formation={formation}
              onDelete={() => handleDelete(formation.id)}
              onViewDetails={() => setSelectedFormationId(formation.id)}
              onScheduledReady={handleScheduledReady}
            />
          ))}
        </div>
      )}

      {/* Detail Modal */}
      {selectedFormationId && (
        <FormationDetailModal
          formationId={selectedFormationId}
          onClose={() => setSelectedFormationId(null)}
          onScheduledReady={handleScheduledReady}
        />
      )}
    </div>
  );
}

interface FormationCardProps {
  formation: any;
  onDelete: () => void;
  onViewDetails: () => void;
  onScheduledReady?: () => void | Promise<void>;
}

function FormationCard({
  formation,
  onDelete,
  onViewDetails,
  onScheduledReady,
}: FormationCardProps) {
  const [showActions, setShowActions] = useState(false);
  const modulesCount = formation.moduleCount || formation.modules?.length || 0;
  const lessonsCount =
    formation.lessonCount ||
    formation.modules?.reduce(
      (sum: number, m: any) => sum + (m.lecons?.length || 0),
      0,
    ) ||
    0;

  return (
    <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] overflow-hidden hover:shadow-lg transition-shadow group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-[var(--primary)]/20 to-[var(--primary-dark)]/20">
        {formation.thumbnail_url ? (
          <img
            src={formation.thumbnail_url}
            alt={formation.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-[var(--primary)]/40" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "px-2 py-1 rounded-full text-xs font-medium border",
              getStatusColor(formation.status),
            )}
          >
            {getStatusLabel(formation.status)}
          </span>
        </div>

        {/* Format Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--card)]/90 text-[var(--foreground)]">
            {formation.format === "video" ? (
              <Video className="w-3 h-3 inline mr-1" />
            ) : (
              <BookOpen className="w-3 h-3 inline mr-1" />
            )}
            {formation.format === "video" ? "Vidéo" : "Texte"}
          </span>
        </div>

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <Link href={`/admin/formations/${formation.id}/modifier`}>
            <button className="p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors">
              <Edit className="w-5 h-5 text-gray-900" />
            </button>
          </Link>
          <button
            onClick={onDelete}
            className="p-2 bg-red-500 rounded-lg hover:bg-red-600 transition-colors"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-5">
        <h3 className="font-semibold text-[var(--foreground)] mb-2 line-clamp-1">
          {formation.title}
        </h3>
        <p className="text-sm text-[var(--muted)] mb-4 line-clamp-2">
          {formation.description || "Aucune description"}
        </p>

        {/* Module & Lesson Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4 p-3 bg-[var(--background)] rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <BookOpen className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">
                {modulesCount}
              </span>{" "}
              module{modulesCount > 1 ? "s" : ""}
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <Video className="w-4 h-4 text-[var(--primary)]" />
            <span className="text-[var(--muted)]">
              <span className="font-semibold text-[var(--foreground)]">
                {lessonsCount}
              </span>{" "}
              leçon{lessonsCount > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-4 text-sm text-[var(--muted)] mb-4">
          <div className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            <span>{formation.enrolled_count || 0}</span>
          </div>
          <div className="flex items-center gap-1">
            <Star className="w-4 h-4" />
            <span>{formation.rating_avg || 0}</span>
          </div>
          {formation.duration_hours && <span>{formation.duration_hours}h</span>}
        </div>

        {/* Scheduled Publishing Info */}
        {formation.status === "scheduled" && formation.scheduled_publish_at && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
            <p className="text-xs font-semibold text-blue-900 mb-1">
              📅 Planifiée
            </p>
            <p className="text-xs text-blue-700">
              {formatUTCDateInTimeZone(
                formation.scheduled_publish_at,
                formation.scheduled_timezone || "UTC",
                true,
              )}
            </p>
            <p className="text-xs text-blue-600">
              {formation.scheduled_timezone || "UTC"}
            </p>
            <Countdown
              targetDate={formation.scheduled_publish_at}
              timezone={formation.scheduled_timezone || "UTC"}
              onReady={onScheduledReady}
            />
          </div>
        )}

        {/* Published Date */}
        {formation.status === "published" && formation.published_at && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700">
              ✅ Publié le{" "}
              {new Date(formation.published_at).toLocaleString("fr-FR")}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="space-y-2 pt-4 border-t border-[var(--border)]">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[var(--foreground)]">
              {formation.is_free ? (
                <span className="text-green-500">Gratuit</span>
              ) : (
                formatPrice(formation.price)
              )}
            </span>
            <span className="text-xs text-[var(--muted)]">
              {formatDate(formation.created_at)}
            </span>
          </div>
          <button
            onClick={onViewDetails}
            className="w-full py-2 rounded-lg bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 text-[var(--primary)] text-sm font-medium transition-colors"
          >
            Voir détails
          </button>
        </div>
      </div>
    </div>
  );
}

interface FormationDetailModalProps {
  formationId: string;
  onClose: () => void;
  onScheduledReady?: () => void | Promise<void>;
}

function FormationDetailModal({
  formationId,
  onClose,
  onScheduledReady,
}: FormationDetailModalProps) {
  const [formation, setFormation] = useState<any>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFormation = async () => {
      try {
        const res = await fetch(`/api/admin/formations/${formationId}`);
        if (res.ok) {
          const data = await res.json();
          setFormation(data);
          // Expand first module by default
          if (data.modules?.length > 0) {
            setExpanded(new Set([data.modules[0].id]));
          }
        }
      } catch (err) {
        console.error("Erreur lors du chargement de la formation:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchFormation();
  }, [formationId]);

  const toggleModule = (moduleId: string) => {
    const newExpanded = new Set(expanded);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpanded(newExpanded);
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-[var(--card)] rounded-2xl border border-[var(--border)] max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--card)] border-b border-[var(--border)] p-6 flex items-start justify-between">
          <div className="flex-1">
            {loading ? (
              <div className="h-8 bg-[var(--background)] rounded animate-pulse w-1/3" />
            ) : (
              <>
                <h2 className="text-2xl font-bold text-[var(--foreground)]">
                  {formation?.title}
                </h2>
                <p className="text-sm text-[var(--muted)] mt-1">
                  {formation?.description}
                </p>
              </>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-8 h-8 animate-spin text-[var(--primary)]" />
            </div>
          ) : !formation?.modules || formation.modules.length === 0 ? (
            <div className="text-center py-12">
              <BookOpen className="w-12 h-12 text-[var(--muted)] mx-auto mb-3" />
              <p className="text-[var(--muted)]">
                Aucun module dans cette formation
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Scheduled Publishing Info */}
              {formation.status === "scheduled" &&
                formation.scheduled_publish_at && (
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-2">
                    <p className="text-sm font-semibold text-blue-900">
                      📅 Publication planifiée
                    </p>
                    <p className="text-sm text-blue-700">
                      {formatUTCDateInTimeZone(
                        formation.scheduled_publish_at,
                        formation.scheduled_timezone || "UTC",
                        true,
                      )}{" "}
                      ({formation.scheduled_timezone || "UTC"})
                    </p>
                    <Countdown
                      targetDate={formation.scheduled_publish_at}
                      timezone={formation.scheduled_timezone || "UTC"}
                      onReady={onScheduledReady}
                    />
                  </div>
                )}

              {/* Published Date */}
              {formation.status === "published" && formation.published_at && (
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">
                    ✅ Publié le{" "}
                    {new Date(formation.published_at).toLocaleString("fr-FR")}
                  </p>
                </div>
              )}

              {/* Formation Stats Summary */}
              <div className="grid grid-cols-4 gap-4 p-4 bg-[var(--background)] rounded-lg mb-6">
                <div>
                  <p className="text-xs text-[var(--muted)]">Modules</p>
                  <p className="text-2xl font-bold text-[var(--primary)]">
                    {
                      formation.modules.filter(
                        (m: any) => m.is_visible !== false,
                      ).length
                    }
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Leçons</p>
                  <p className="text-2xl font-bold text-[var(--primary)]">
                    {formation.modules.reduce((sum: number, m: any) => {
                      if (m.is_visible === false) return sum;
                      return (
                        sum +
                        (m.lecons?.filter((l: any) => l.is_visible !== false)
                          .length || 0)
                      );
                    }, 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Inscrits</p>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {formation.enrolled_count || 0}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-[var(--muted)]">Note</p>
                  <p className="text-2xl font-bold text-[var(--foreground)]">
                    {formation.rating_avg || "—"}
                  </p>
                </div>
              </div>

              {/* Modules List */}
              <div className="space-y-3">
                {formation.modules
                  .filter((m: any) => m.is_visible !== false)
                  .map((module: any, moduleIdx: number) => (
                    <div
                      key={module.id}
                      className="border border-[var(--border)] rounded-lg overflow-hidden"
                    >
                      {/* Module Header */}
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full p-4 flex items-center gap-3 bg-[var(--background)] hover:bg-[var(--background)]/80 transition-colors text-left"
                      >
                        {expanded.has(module.id) ? (
                          <ChevronUp className="w-5 h-5 flex-shrink-0" />
                        ) : (
                          <ChevronDown className="w-5 h-5 flex-shrink-0" />
                        )}
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-[var(--foreground)]">
                              {moduleIdx + 1}. {module.title}
                            </span>
                            {module.intro_type && (
                              <span className="px-2 py-0.5 text-xs bg-[var(--primary)]/10 text-[var(--primary)] rounded">
                                {module.intro_type === "video"
                                  ? "Avec intro vidéo"
                                  : "Avec intro texte"}
                              </span>
                            )}
                          </div>
                          {module.description && (
                            <p className="text-sm text-[var(--muted)]">
                              {module.description}
                            </p>
                          )}
                        </div>
                        <span className="text-sm font-medium text-[var(--muted)] bg-[var(--card)] px-3 py-1 rounded-full">
                          {module.lecons?.length || 0} leçon
                          {(module.lecons?.length || 0) !== 1 ? "s" : ""}
                        </span>
                      </button>

                      {/* Module Content */}
                      {expanded.has(module.id) && (
                        <div className="border-t border-[var(--border)] p-4 space-y-2 bg-[var(--card)]">
                          {/* Module Intro */}
                          {module.intro_type === "text" &&
                            module.intro_text && (
                              <div className="mb-4 p-3 bg-[var(--background)] rounded-lg">
                                <p className="text-xs font-semibold text-[var(--muted)] mb-1">
                                  📝 Introduction texte:
                                </p>
                                <p className="text-sm text-[var(--foreground)]">
                                  {module.intro_text}
                                </p>
                              </div>
                            )}
                          {module.intro_type === "video" &&
                            module.intro_video_url && (
                              <div className="mb-4 space-y-2">
                                <div className="p-3 bg-[var(--background)] rounded-lg">
                                  <p className="text-xs font-semibold text-[var(--muted)] mb-1">
                                    🎥 Introduction vidéo (
                                    {module.intro_video_type}):
                                  </p>
                                  <p className="text-sm font-mono text-[var(--primary)] truncate">
                                    {module.intro_video_url}
                                  </p>
                                </div>
                                <Preview
                                  type={module.intro_video_type as VideoType}
                                  url={module.intro_video_url}
                                />
                              </div>
                            )}

                          {/* Lessons */}
                          {module.lecons &&
                          module.lecons.filter(
                            (l: any) => l.is_visible !== false,
                          ).length > 0 ? (
                            <div className="space-y-2">
                              {module.lecons
                                .filter((l: any) => l.is_visible !== false)
                                .map((lesson: any, lessonIdx: number) => (
                                  <div
                                    key={lesson.id}
                                    className="p-3 bg-[var(--background)] rounded-lg border border-[var(--border)]/50 hover:border-[var(--border)] transition-colors space-y-3"
                                  >
                                    <div className="flex items-start gap-3">
                                      <Video className="w-4 h-4 mt-1 flex-shrink-0 text-[var(--primary)]" />
                                      <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-[var(--foreground)]">
                                          {lessonIdx + 1}. {lesson.title}
                                          {lesson.is_preview && (
                                            <span className="ml-2 text-xs bg-green-500/20 text-green-700 dark:text-green-400 px-2 py-0.5 rounded">
                                              Aperçu gratuit
                                            </span>
                                          )}
                                        </h4>
                                        {lesson.content && (
                                          <p className="text-sm text-[var(--muted)] mt-1">
                                            {lesson.content.substring(0, 100)}
                                            ...
                                          </p>
                                        )}
                                        <div className="flex items-center gap-4 mt-2 text-xs text-[var(--muted)]">
                                          {lesson.video_type && (
                                            <span className="flex items-center gap-1">
                                              <Video className="w-3 h-3" />
                                              {lesson.video_type === "upload"
                                                ? "📤 Vidéo uploadée"
                                                : `🔗 ${lesson.video_type}`}
                                            </span>
                                          )}
                                          {lesson.duration_min && (
                                            <span>
                                              ⏱️ {lesson.duration_min} min
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    {/* Video Preview */}
                                    {lesson.video_url && (
                                      <div className="mt-2">
                                        <Preview
                                          type={lesson.video_type as VideoType}
                                          url={lesson.video_url}
                                        />
                                      </div>
                                    )}
                                  </div>
                                ))}
                            </div>
                          ) : (
                            <p className="text-sm text-[var(--muted)] text-center py-4">
                              Aucune leçon dans ce module
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-[var(--card)] border-t border-[var(--border)] p-4 flex items-center justify-between">
          <span className="text-sm text-[var(--muted)]">
            {formation && `Créée le ${formatDate(formation.created_at)}`}
          </span>
          <Link href={`/admin/formations/${formationId}/modifier`}>
            <Button size="sm">
              <Edit className="w-4 h-4 mr-2" />
              Éditer
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
