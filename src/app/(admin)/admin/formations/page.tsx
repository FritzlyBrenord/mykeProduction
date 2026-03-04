"use client";

import { useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  BookOpen,
  Video,
  Users,
  Star,
  TrendingUp,
  Calendar,
  Clock,
  Grid3X3,
  List,
} from "lucide-react";
import { useFormations, useDeleteFormation } from "@/hooks/useAdmin";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import { formatPrice, getStatusColor, getStatusLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { formatUTCDateInTimeZone } from "@/lib/timezone";
import FormationDetail from "./components/FormationDetail";

export default function FormationsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [formatFilter, setFormatFilter] = useState<string>("");
  const [selectedFormationId, setSelectedFormationId] = useState<string | null>(
    null,
  );
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 12;

  const params = useMemo(
    () => ({
      status: statusFilter || undefined,
      search: search || undefined,
      page: currentPage,
      limit: itemsPerPage,
    }),
    [statusFilter, search, currentPage, itemsPerPage],
  );

  const {
    data: response,
    isLoading,
    isError,
    error,
    refetch,
  } = useFormations(params);

  const formations = response?.data || [];
  const pagination = response?.pagination || {
    total: 0,
    page: 1,
    limit: itemsPerPage,
    totalPages: 1,
  };

  const deleteMutation = useDeleteFormation();

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
    }
  }, [refetch]);

  // Show detail view
  if (selectedFormationId) {
    return (
      <FormationDetail
        formationId={selectedFormationId}
        onBack={() => setSelectedFormationId(null)}
        onScheduledReady={handleScheduledReady}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))]">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-6">
            <div>
              <h1 className="text-3xl font-bold text-[hsl(var(--foreground))]">
                Formations
              </h1>
              <p className="text-[hsl(var(--muted-foreground))] mt-2">
                Gérez vos formations et suivez leurs performances
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center bg-[hsl(var(--input))] rounded-lg p-1">
                <button
                  onClick={() => setViewMode("grid")}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === "grid"
                      ? "bg-[hsl(var(--card))] shadow-sm"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <Grid3X3 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setViewMode("list")}
                  className={cn(
                    "p-2 rounded-md transition-colors",
                    viewMode === "list"
                      ? "bg-[hsl(var(--card))] shadow-sm"
                      : "text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]",
                  )}
                >
                  <List className="w-4 h-4" />
                </button>
              </div>
              <Link href="/admin/formations/nouvelle">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Nouvelle formation
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-sm border border-[hsl(var(--border))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Total formations
                </p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1">
                  {pagination.total || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-[hsl(var(--primary))/0.12] rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-[hsl(var(--primary))]" />
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-sm border border-[hsl(var(--border))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Publiées
                </p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1">
                  {formations?.filter((f: any) => f.status === "published")
                    .length || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-emerald-500/15 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-emerald-500" />
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-sm border border-[hsl(var(--border))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Total inscrits
                </p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1">
                  {formations?.reduce(
                    (sum: number, f: any) => sum + (f.enrolled_count || 0),
                    0,
                  ) || 0}
                </p>
              </div>
              <div className="w-12 h-12 bg-indigo-500/15 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-indigo-500" />
              </div>
            </div>
          </div>
          <div className="bg-[hsl(var(--card))] rounded-xl shadow-sm border border-[hsl(var(--border))] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-[hsl(var(--muted-foreground))]">
                  Note moyenne
                </p>
                <p className="text-2xl font-bold text-[hsl(var(--foreground))] mt-1">
                  {formations?.length > 0
                    ? (
                        formations.reduce(
                          (sum: number, f: any) => sum + (f.rating_avg || 0),
                          0,
                        ) / formations.length
                      ).toFixed(1)
                    : "0"}
                </p>
              </div>
              <div className="w-12 h-12 bg-amber-500/15 rounded-lg flex items-center justify-center">
                <Star className="w-6 h-6 text-amber-500" />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-[hsl(var(--card))] rounded-xl shadow-sm border border-[hsl(var(--border))] p-6">
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[hsl(var(--muted-foreground))]" />
              <input
                type="text"
                placeholder="Rechercher une formation..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage((prev) => (prev === 1 ? prev : 1));
                }}
                className="w-full pl-10 pr-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] placeholder:text-[hsl(var(--muted-foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
              />
            </div>
            <div className="flex gap-3">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage((prev) => (prev === 1 ? prev : 1));
                }}
                className="px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
              >
                <option value="">Tous les statuts</option>
                <option value="draft">Brouillon</option>
                <option value="published">Publié</option>
                <option value="scheduled">Planifiée</option>
                <option value="archived">Archivé</option>
              </select>
              <select
                value={formatFilter}
                onChange={(e) => {
                  setFormatFilter(e.target.value);
                  setCurrentPage((prev) => (prev === 1 ? prev : 1));
                }}
                className="px-4 py-3 bg-[hsl(var(--background))] border border-[hsl(var(--border))] rounded-lg text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--primary))] focus:border-transparent"
              >
                <option value="">Tous les formats</option>
                <option value="video">Vidéo</option>
                <option value="text">Texte</option>
              </select>
            </div>
          </div>
        </div>

        {/* Formations */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[hsl(var(--primary))]" />
          </div>
        ) : isError ? (
          <div className="text-center py-12 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-2xl">
            <h3 className="text-lg font-semibold text-[hsl(var(--foreground))] mb-2">
              Impossible de charger les formations
            </h3>
            <p className="text-sm text-red-600 mb-4">
              {(error as Error)?.message || "Erreur inconnue"}
            </p>
            <Button onClick={() => window.location.reload()}>Réessayer</Button>
          </div>
        ) : filteredFormations.length === 0 ? (
          <div className="text-center py-16 bg-[hsl(var(--card))] rounded-2xl border border-[hsl(var(--border))]">
            <BookOpen className="w-16 h-16 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
              Aucune formation
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              Commencez par créer votre première formation
            </p>
            <Link href="/admin/formations/nouvelle">
              <Button>Créer une formation</Button>
            </Link>
          </div>
        ) : (
          <div
            className={cn(
              viewMode === "grid"
                ? "grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6"
                : "space-y-4",
            )}
          >
            {filteredFormations.map((formation: any) => (
              <FormationCard
                key={formation.id}
                formation={formation}
                onDelete={() => handleDelete(formation.id)}
                onViewDetails={() => setSelectedFormationId(formation.id)}
                onScheduledReady={handleScheduledReady}
                viewMode={viewMode}
              />
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="mt-8 flex items-center justify-between">
            <div className="text-sm text-[hsl(var(--muted-foreground))]">
              Affichage de {(pagination.page - 1) * pagination.limit + 1} à{" "}
              {Math.min(pagination.page * pagination.limit, pagination.total)}{" "}
              sur {pagination.total} formations
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.page - 1)}
                disabled={pagination.page <= 1}
              >
                Précédent
              </Button>
              <div className="flex items-center gap-1">
                {Array.from(
                  { length: Math.min(5, pagination.totalPages) },
                  (_, i) => {
                    const page = i + 1;
                    const isActive = page === pagination.page;
                    return (
                      <Button
                        key={page}
                        variant={isActive ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={
                          isActive ? "bg-[hsl(var(--primary))] text-white" : ""
                        }
                      >
                        {page}
                      </Button>
                    );
                  },
                )}
                {pagination.totalPages > 5 && (
                  <>
                    <span className="px-2 text-[hsl(var(--muted-foreground))]">
                      ...
                    </span>
                    <Button
                      variant={
                        pagination.page === pagination.totalPages
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => setCurrentPage(pagination.totalPages)}
                      className={
                        pagination.page === pagination.totalPages
                          ? "bg-[hsl(var(--primary))] text-white"
                          : ""
                      }
                    >
                      {pagination.totalPages}
                    </Button>
                  </>
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
              >
                Suivant
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

interface FormationCardProps {
  formation: any;
  onDelete: () => void;
  onViewDetails: () => void;
  onScheduledReady?: () => void | Promise<void>;
  viewMode: "grid" | "list";
}

function FormationCard({
  formation,
  onDelete,
  onViewDetails,
  onScheduledReady,
  viewMode,
}: FormationCardProps) {
  const modulesCount = formation.moduleCount || formation.modules?.length || 0;
  const lessonsCount =
    formation.lessonCount ||
    formation.modules?.reduce(
      (sum: number, m: any) => sum + (m.lecons?.length || 0),
      0,
    ) ||
    0;

  if (viewMode === "list") {
    return (
      <div className="bg-[hsl(var(--card))] rounded-xl shadow-sm border border-[hsl(var(--border))] p-6 hover:shadow-md transition-shadow">
        <div className="flex items-center gap-6">
          {/* Thumbnail */}
          <div className="shrink-0 w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            {formation.thumbnail_url ? (
              <img
                src={formation.thumbnail_url}
                alt={formation.title}
                className="w-full h-full object-cover rounded-lg"
              />
            ) : (
              <BookOpen className="w-8 h-8 text-white/50" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <h3 className="font-semibold text-[hsl(var(--foreground))] truncate">
                {formation.title}
              </h3>
              <span
                className={cn(
                  "px-2 py-1 rounded-full text-xs font-medium border",
                  getStatusColor(formation.status),
                )}
              >
                {getStatusLabel(formation.status)}
              </span>
              <span className="px-2 py-1 rounded-full text-xs font-medium bg-[hsl(var(--input))] text-[hsl(var(--muted-foreground))]">
                {formation.format === "video" ? "Vidéo" : "Texte"}
              </span>
            </div>
            <p className="text-sm text-[hsl(var(--muted-foreground))] mb-3 line-clamp-2">
              {formation.description || "Aucune description"}
            </p>
            <div className="flex items-center gap-6 text-sm text-[hsl(var(--muted-foreground))]">
              <span className="flex items-center gap-1">
                <BookOpen className="w-4 h-4" />
                {modulesCount} module{modulesCount > 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Video className="w-4 h-4" />
                {lessonsCount} leçon{lessonsCount > 1 ? "s" : ""}
              </span>
              <span className="flex items-center gap-1">
                <Users className="w-4 h-4" />
                {formation.enrolled_count || 0}
              </span>
              <span className="flex items-center gap-1">
                <Star className="w-4 h-4" />
                {formation.rating_avg || 0}
              </span>
              <span className="font-semibold text-[hsl(var(--foreground))]">
                {formation.is_free ? (
                  <span className="text-emerald-500">Gratuit</span>
                ) : (
                  formatPrice(formation.price)
                )}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={onViewDetails}
              className="px-4 py-2 text-sm font-medium text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] hover:bg-[hsl(var(--background))] rounded-lg transition-colors"
            >
              Voir détails
            </button>
            <Link href={`/admin/formations/${formation.id}/modifier`}>
              <Button size="sm" variant="outline">
                <Edit className="w-4 h-4" />
              </Button>
            </Link>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="text-red-600 hover:text-red-400 hover:bg-red-500/10"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden hover:shadow-lg transition-all duration-200 group">
      {/* Thumbnail */}
      <div className="relative aspect-video bg-gradient-to-br from-blue-500 to-purple-600">
        {formation.thumbnail_url ? (
          <img
            src={formation.thumbnail_url}
            alt={formation.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <BookOpen className="w-12 h-12 text-white/50" />
          </div>
        )}

        {/* Status Badge */}
        <div className="absolute top-3 left-3">
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-medium border backdrop-blur-sm",
              getStatusColor(formation.status),
            )}
          >
            {getStatusLabel(formation.status)}
          </span>
        </div>

        {/* Format Badge */}
        <div className="absolute top-3 right-3">
          <span className="px-3 py-1 rounded-full text-xs font-medium bg-[hsl(var(--card))/0.9] text-[hsl(var(--muted-foreground))] backdrop-blur-sm">
            {formation.format === "video" ? (
              <Video className="w-3 h-3 inline mr-1" />
            ) : (
              <BookOpen className="w-3 h-3 inline mr-1" />
            )}
            {formation.format === "video" ? "Vidéo" : "Texte"}
          </span>
        </div>

        {/* Actions Overlay */}
        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
          <button
            onClick={onViewDetails}
            className="p-3 bg-[hsl(var(--card))] rounded-lg hover:bg-[hsl(var(--background))] transition-colors shadow-lg"
          >
            <Eye className="w-5 h-5 text-[hsl(var(--foreground))]" />
          </button>
          <Link href={`/admin/formations/${formation.id}/modifier`}>
            <button className="p-3 bg-[hsl(var(--card))] rounded-lg hover:bg-[hsl(var(--background))] transition-colors shadow-lg">
              <Edit className="w-5 h-5 text-[hsl(var(--foreground))]" />
            </button>
          </Link>
          <button
            onClick={onDelete}
            className="p-3 bg-red-500 rounded-lg hover:bg-red-600 transition-colors shadow-lg"
          >
            <Trash2 className="w-5 h-5 text-white" />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <h3 className="font-semibold text-[hsl(var(--foreground))] mb-2 line-clamp-1">
          {formation.title}
        </h3>
        <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4 line-clamp-2">
          {formation.description || "Aucune description"}
        </p>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="flex items-center gap-2 p-3 bg-[hsl(var(--background))] rounded-lg">
            <BookOpen className="w-4 h-4 text-[hsl(var(--primary))]" />
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Modules
              </div>
              <div className="font-semibold text-[hsl(var(--foreground))]">
                {modulesCount}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 p-3 bg-[hsl(var(--background))] rounded-lg">
            <Video className="w-4 h-4 text-emerald-500" />
            <div>
              <div className="text-xs text-[hsl(var(--muted-foreground))]">
                Leçons
              </div>
              <div className="font-semibold text-[hsl(var(--foreground))]">
                {lessonsCount}
              </div>
            </div>
          </div>
        </div>

        {/* Additional Stats */}
        <div className="flex items-center justify-between text-sm text-[hsl(var(--muted-foreground))] mb-4">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Users className="w-4 h-4" />
              {formation.enrolled_count || 0}
            </span>
            <span className="flex items-center gap-1">
              <Star className="w-4 h-4" />
              {formation.rating_avg || 0}
            </span>
            {formation.duration_hours && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formation.duration_hours}h
              </span>
            )}
          </div>
        </div>

        {/* Scheduled Publishing Info */}
        {formation.status === "scheduled" && formation.scheduled_publish_at && (
          <div className="mb-4 p-3 bg-[hsl(var(--primary))/0.12] border border-[hsl(var(--primary))/0.3] rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <Calendar className="w-4 h-4 text-[hsl(var(--primary))]" />
              <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                Planifiée
              </span>
            </div>
            <p className="text-xs text-[hsl(var(--primary))] mb-2">
              {formatUTCDateInTimeZone(
                formation.scheduled_publish_at,
                formation.scheduled_timezone || "UTC",
                true,
              )}
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
          <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-emerald-500 rounded-full" />
              <span className="text-xs text-emerald-500">
                Publié le{" "}
                {new Date(formation.published_at).toLocaleString("fr-FR")}
              </span>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[hsl(var(--border))]">
          <span className="font-semibold text-[hsl(var(--foreground))]">
            {formation.is_free ? (
              <span className="text-emerald-500">Gratuit</span>
            ) : (
              formatPrice(formation.price)
            )}
          </span>
          <button
            onClick={onViewDetails}
            className="px-4 py-2 bg-[hsl(var(--primary))] hover:bg-[hsl(var(--primary-dark))] text-white text-sm font-medium rounded-lg transition-colors"
          >
            Voir détails
          </button>
        </div>
      </div>
    </div>
  );
}
