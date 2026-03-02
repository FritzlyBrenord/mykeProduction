"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import {
  ChevronDown,
  ChevronUp,
  Edit,
  BookOpen,
  Video,
  Users,
  Star,
  Clock,
  FileText,
  PlayCircle,
  Eye,
  ArrowLeft,
  Calendar,
  TrendingUp,
  Award,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Countdown } from "@/components/Countdown";
import {
  formatPrice,
  formatDate,
  getStatusColor,
  getStatusLabel,
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
        className="w-full rounded-xl border border-[hsl(var(--border))] bg-black shadow-sm"
        src={url}
      />
    );
  if (type === "youtube") {
    const id = yt(url);
    return id ? (
      <iframe
        className="w-full aspect-video rounded-xl border border-[hsl(var(--border))] shadow-sm"
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
        className="w-full aspect-video rounded-xl border border-[hsl(var(--border))] shadow-sm"
        src={`https://player.vimeo.com/video/${id}`}
        allowFullScreen
      />
    ) : (
      <p className="text-xs text-red-500">URL Vimeo invalide</p>
    );
  }
  return null;
}

interface FormationDetailProps {
  formationId: string;
  onBack: () => void;
  onScheduledReady?: () => void | Promise<void>;
}

interface FormationEnrollment {
  id: string;
  user_id: string;
  enrolled_at: string;
  completed_at: string | null;
  progress: number | null;
  user: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
}

export default function FormationDetail({
  formationId,
  onBack,
  onScheduledReady,
}: FormationDetailProps) {
  const [formation, setFormation] = useState<any>(null);
  const [expandedModules, setExpandedModules] = useState<Set<string>>(
    new Set(),
  );
  const [expandedLessons, setExpandedLessons] = useState<Set<string>>(
    new Set(),
  );
  const [showEnrolledUsers, setShowEnrolledUsers] = useState(false);
  const [showStatistics, setShowStatistics] = useState(false);
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
            setExpandedModules(new Set([data.modules[0].id]));
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
    const newExpanded = new Set(expandedModules);
    if (newExpanded.has(moduleId)) {
      newExpanded.delete(moduleId);
    } else {
      newExpanded.add(moduleId);
    }
    setExpandedModules(newExpanded);
  };

  const toggleLesson = (lessonId: string) => {
    const newExpanded = new Set(expandedLessons);
    if (newExpanded.has(lessonId)) {
      newExpanded.delete(lessonId);
    } else {
      newExpanded.add(lessonId);
    }
    setExpandedLessons(newExpanded);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse">
            <div className="h-8 bg-[hsl(var(--muted))] rounded w-1/3 mb-6" />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-2 space-y-6">
                <div className="h-64 bg-[hsl(var(--muted))] rounded-xl" />
                <div className="h-96 bg-[hsl(var(--muted))] rounded-xl" />
              </div>
              <div className="space-y-6">
                <div className="h-48 bg-[hsl(var(--muted))] rounded-xl" />
                <div className="h-64 bg-[hsl(var(--muted))] rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!formation) {
    return (
      <div className="min-h-screen bg-[hsl(var(--background))] p-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-16">
            <BookOpen className="w-16 h-16 text-[hsl(var(--muted-foreground))] mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-[hsl(var(--foreground))] mb-2">
              Formation non trouvÃ©e
            </h3>
            <p className="text-[hsl(var(--muted-foreground))] mb-6">
              La formation que vous recherchez n'existe pas ou a Ã©tÃ© supprimÃ©e.
            </p>
            <Button onClick={onBack}>Retour Ã  la liste</Button>
          </div>
        </div>
      </div>
    );
  }

  const totalModules =
    formation.modules?.filter((m: any) => m.is_visible !== false).length || 0;
  const totalLessons =
    formation.modules?.reduce((sum: number, m: any) => {
      if (m.is_visible === false) return sum;
      return (
        sum + (m.lecons?.filter((l: any) => l.is_visible !== false).length || 0)
      );
    }, 0) || 0;
  const enrolledUsers = (formation.enrollments || []) as FormationEnrollment[];
  const totalEnrolled = Math.max(
    enrolledUsers.length,
    Number(formation.enrolled_count || 0),
  );
  const completedEnrollments = enrolledUsers.filter(
    (enrollment) =>
      Boolean(enrollment.completed_at) || Number(enrollment.progress || 0) >= 100,
  ).length;
  const inProgressEnrollments = enrolledUsers.filter((enrollment) => {
    const progress = Number(enrollment.progress || 0);
    return progress > 0 && progress < 100 && !enrollment.completed_at;
  }).length;
  const notStartedEnrollments = Math.max(
    totalEnrolled - completedEnrollments - inProgressEnrollments,
    0,
  );
  const averageProgress =
    enrolledUsers.length > 0
      ? Math.round(
          enrolledUsers.reduce(
            (sum, enrollment) =>
              sum + Math.max(0, Math.min(100, Number(enrollment.progress || 0))),
            0,
          ) / enrolledUsers.length,
        )
      : 0;
  const completionRate =
    totalEnrolled > 0
      ? Math.round((completedEnrollments / totalEnrolled) * 100)
      : 0;
  const inProgressRate =
    totalEnrolled > 0
      ? Math.round((inProgressEnrollments / totalEnrolled) * 100)
      : 0;
  const notStartedRate = Math.max(
    0,
    Math.min(100, 100 - completionRate - inProgressRate),
  );

  return (
    <div className="min-h-screen bg-[hsl(var(--background))]">
      {/* Header */}
      <div className="bg-[hsl(var(--card))] border-b border-[hsl(var(--border))] sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onBack}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Retour
              </Button>
              <div className="h-6 w-px bg-[hsl(var(--border))]" />
              <div>
                <h1 className="text-2xl font-bold text-[hsl(var(--foreground))]">
                  {formation.title}
                </h1>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mt-1">
                  {formation.description || "Aucune description"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span
                className={cn(
                  "px-3 py-1 rounded-full text-sm font-medium border",
                  getStatusColor(formation.status),
                )}
              >
                {getStatusLabel(formation.status)}
              </span>
              <Link href={`/admin/formations/${formationId}/modifier`}>
                <Button className="flex items-center gap-2">
                  <Edit className="w-4 h-4" />
                  Modifier
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-8">
            {/* Hero Section */}
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] overflow-hidden">
              {formation.thumbnail_url ? (
                <img
                  src={formation.thumbnail_url}
                  alt={formation.title}
                  className="w-full h-64 object-cover"
                />
              ) : (
                <div className="w-full h-64 bg-gradient-to-br from-[hsl(var(--primary))] to-[hsl(var(--accent))] flex items-center justify-center">
                  <BookOpen className="w-16 h-16 text-white/50" />
                </div>
              )}

              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <span className="px-3 py-1 bg-[hsl(var(--muted))] text-[hsl(var(--primary))] rounded-full text-sm font-medium">
                      {formation.format === "video" ? (
                        <>
                          <Video className="w-4 h-4 inline mr-1" />
                          VidÃ©o
                        </>
                      ) : (
                        <>
                          <FileText className="w-4 h-4 inline mr-1" />
                          Texte
                        </>
                      )}
                    </span>
                    <span className="text-sm text-[hsl(var(--muted-foreground))]">
                      CrÃ©Ã©e le {formatDate(formation.created_at)}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                      {formation.is_free ? (
                        <span className="text-emerald-500">Gratuit</span>
                      ) : (
                        formatPrice(formation.price)
                      )}
                    </div>
                  </div>
                </div>

                {/* Publishing Info */}
                {formation.status === "scheduled" &&
                  formation.scheduled_publish_at && (
                    <div className="mb-4 p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))/0.5]">
                      <div className="flex items-center gap-2 mb-2">
                        <Calendar className="w-4 h-4 text-[hsl(var(--primary))]" />
                        <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                          Publication planifiÃ©e
                        </span>
                      </div>
                      <p className="text-sm text-[hsl(var(--primary))] mb-2">
                        {formatUTCDateInTimeZone(
                          formation.scheduled_publish_at,
                          formation.scheduled_timezone || "UTC",
                          true,
                        )}
                      </p>
                      <p className="text-xs text-[hsl(var(--muted-foreground))] mb-3">
                        Fuseau horaire: {formation.scheduled_timezone || "UTC"}
                      </p>
                      <Countdown
                        targetDate={formation.scheduled_publish_at}
                        timezone={formation.scheduled_timezone || "UTC"}
                        onReady={onScheduledReady}
                      />
                    </div>
                  )}

                {formation.status === "published" && formation.published_at && (
                  <div className="mb-4 p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))/0.5]">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full" />
                      <span className="text-sm text-emerald-500">
                        PubliÃ©e le{" "}
                        {new Date(formation.published_at).toLocaleString(
                          "fr-FR",
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Modules & Lessons */}
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[hsl(var(--foreground))]">
                  Contenu de la formation
                </h2>
                <div className="flex items-center gap-4 text-sm text-[hsl(var(--muted-foreground))]">
                  <span className="flex items-center gap-1">
                    <BookOpen className="w-4 h-4" />
                    {totalModules} module{totalModules > 1 ? "s" : ""}
                  </span>
                  <span className="flex items-center gap-1">
                    <Video className="w-4 h-4" />
                    {totalLessons} leÃ§on{totalLessons > 1 ? "s" : ""}
                  </span>
                </div>
              </div>

              {!formation.modules || formation.modules.length === 0 ? (
                <div className="text-center py-12">
                  <BookOpen className="w-12 h-12 text-[hsl(var(--muted-foreground))] mx-auto mb-3" />
                  <p className="text-[hsl(var(--muted-foreground))]">
                    Aucun module dans cette formation
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formation.modules
                    .filter((m: any) => m.is_visible !== false)
                    .map((module: any, moduleIdx: number) => (
                      <div
                        key={module.id}
                        className="border border-[hsl(var(--border))] rounded-xl overflow-hidden hover:shadow-md transition-shadow"
                      >
                        {/* Module Header */}
                        <button
                          onClick={() => toggleModule(module.id)}
                          className="w-full p-4 flex items-center gap-4 bg-[hsl(var(--muted))] hover:bg-[hsl(var(--muted))]/80 transition-colors text-left"
                        >
                          <div className="flex-shrink-0">
                            {expandedModules.has(module.id) ? (
                              <ChevronUp className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-[hsl(var(--muted-foreground))]" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <span className="font-semibold text-[hsl(var(--foreground))]">
                                Module {moduleIdx + 1}: {module.title}
                              </span>
                              {module.intro_type && (
                                <span className="px-2 py-1 text-xs bg-[hsl(var(--primary))/0.12] text-[hsl(var(--primary))] rounded">
                                  {module.intro_type === "video"
                                    ? "Intro vidÃ©o"
                                    : "Intro texte"}
                                </span>
                              )}
                            </div>
                            {module.description && (
                              <p className="text-sm text-[hsl(var(--muted-foreground))] line-clamp-2">
                                {module.description}
                              </p>
                            )}
                          </div>
                          <div className="flex-shrink-0">
                            <span className="px-3 py-1 bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-full text-sm font-medium text-[hsl(var(--foreground))]">
                              {module.lecons?.filter(
                                (l: any) => l.is_visible !== false,
                              ).length || 0}{" "}
                              leÃ§on
                              {(module.lecons?.filter(
                                (l: any) => l.is_visible !== false,
                              ).length || 0) !== 1
                                ? "s"
                                : ""}
                            </span>
                          </div>
                        </button>

                        {/* Module Content */}
                        {expandedModules.has(module.id) && (
                          <div className="border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]">
                            {/* Module Intro */}
                            {module.intro_type === "text" &&
                              module.intro_text && (
                                <div className="p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))/0.5]">
                                  <div className="flex items-center gap-2 mb-2">
                                    <FileText className="w-4 h-4 text-[hsl(var(--primary))]" />
                                    <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                                      Introduction texte
                                    </span>
                                  </div>
                                  <p className="text-sm text-[hsl(var(--foreground))]">
                                    {module.intro_text}
                                  </p>
                                </div>
                              )}

                            {module.intro_type === "video" &&
                              module.intro_video_url && (
                                <div className="p-4 bg-[hsl(var(--muted))] rounded-lg border border-[hsl(var(--border))/0.5] space-y-3">
                                  <div className="flex items-center gap-2">
                                    <PlayCircle className="w-4 h-4 text-[hsl(var(--primary))]" />
                                    <span className="text-sm font-semibold text-[hsl(var(--primary))]">
                                      Introduction vidÃ©o (
                                      {module.intro_video_type})
                                    </span>
                                  </div>
                                  <p className="text-xs font-mono text-[hsl(var(--primary))] truncate">
                                    {module.intro_video_url}
                                  </p>
                                  <Preview
                                    type={module.intro_video_type as VideoType}
                                    url={module.intro_video_url}
                                  />
                                </div>
                              )}

                            {/* Lessons */}
                            <div className="divide-y divide-[hsl(var(--border))]">
                              {module.lecons
                                ?.filter((l: any) => l.is_visible !== false)
                                .map((lesson: any, lessonIdx: number) => (
                                  <div
                                    key={lesson.id}
                                    className="p-4 hover:bg-[hsl(var(--muted))]/80 transition-colors"
                                  >
                                    <div className="flex items-start gap-4">
                                      <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 bg-[hsl(var(--primary))] rounded-full flex items-center justify-center">
                                          <Video className="w-4 h-4 mt-1 text-white" />
                                        </div>
                                      </div>
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                          <h4 className="font-semibold text-[hsl(var(--foreground))]">
                                            LeÃ§on {lessonIdx + 1}:{" "}
                                            {lesson.title}
                                          </h4>
                                          {lesson.is_preview && (
                                            <span className="ml-2 text-xs bg-emerald-500/15 text-emerald-500 rounded px-2 py-0.5">
                                              AperÃ§u gratuit
                                            </span>
                                          )}
                                        </div>
                                        {lesson.content && (
                                          <p className="text-sm text-[hsl(var(--muted-foreground))] mb-2 line-clamp-2">
                                            {lesson.content}
                                          </p>
                                        )}
                                        <div className="flex items-center gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                                          {lesson.video_type && (
                                            <span className="flex items-center gap-1">
                                              <Video className="w-3 h-3" />
                                              {lesson.video_type === "upload"
                                                ? "VidÃ©o uploadÃ©e"
                                                : lesson.video_type}
                                            </span>
                                          )}
                                          {lesson.duration_min && (
                                            <span className="flex items-center gap-1">
                                              <Clock className="w-3 h-3" />
                                              {lesson.duration_min} min
                                            </span>
                                          )}
                                        </div>
                                        {lesson.video_url && (
                                          <div className="mt-3">
                                            <button
                                              onClick={() =>
                                                toggleLesson(lesson.id)
                                              }
                                              className="flex items-center gap-2 text-sm text-[hsl(var(--primary))] hover:text-[hsl(var(--primary))] mb-2"
                                            >
                                              <Eye className="w-4 h-4" />
                                              {expandedLessons.has(lesson.id)
                                                ? "Masquer"
                                                : "Afficher"}{" "}
                                              la vidÃ©o
                                            </button>
                                            {expandedLessons.has(lesson.id) && (
                                              <Preview
                                                type={
                                                  lesson.video_type as VideoType
                                                }
                                                url={lesson.video_url}
                                              />
                                            )}
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))}
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Stats Card */}
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4">
                Statistiques
              </h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-500/10 rounded-lg">
                  <BookOpen className="w-6 h-6 text-blue-600 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {totalModules}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Modules</div>
                </div>
                <div className="text-center p-3 bg-emerald-500/10 rounded-lg">
                  <Video className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {totalLessons}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">LeÃ§ons</div>
                </div>
                <div className="text-center p-3 bg-indigo-500/10 rounded-lg">
                  <Users className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {totalEnrolled}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Inscrits</div>
                </div>
                <div className="text-center p-3 bg-amber-500/10 rounded-lg">
                  <Star className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                  <div className="text-2xl font-bold text-[hsl(var(--foreground))]">
                    {formation.rating_avg || "-"}
                  </div>
                  <div className="text-xs text-[hsl(var(--muted-foreground))]">Note</div>
                </div>
              </div>
            </div>
            {showStatistics && (
              <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-1">
                  Statistiques detaillees
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  Suivi des progressions pour cette formation.
                </p>

                <div className="grid grid-cols-2 gap-3 mb-4">
                  <div className="rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Target className="w-4 h-4 text-blue-500" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        Progression moyenne
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[hsl(var(--foreground))]">
                      {averageProgress}%
                    </p>
                  </div>
                  <div className="rounded-lg bg-[hsl(var(--background))] border border-[hsl(var(--border))] p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <Award className="w-4 h-4 text-emerald-500" />
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">
                        Taux de completion
                      </span>
                    </div>
                    <p className="text-lg font-bold text-[hsl(var(--foreground))]">
                      {completionRate}%
                    </p>
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        Termines
                      </span>
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {completedEnrollments}/{totalEnrolled}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className="h-full bg-emerald-500"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        En cours
                      </span>
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {inProgressEnrollments}/{totalEnrolled}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${inProgressRate}%` }}
                      />
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-[hsl(var(--muted-foreground))]">
                        Non commences
                      </span>
                      <span className="font-semibold text-[hsl(var(--foreground))]">
                        {notStartedEnrollments}/{totalEnrolled}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[hsl(var(--muted))] overflow-hidden">
                      <div
                        className="h-full bg-amber-500"
                        style={{ width: `${notStartedRate}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Quick Actions */}
            <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
              <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-4">
                Actions rapides
              </h3>
              <div className="space-y-3">
                <Link href={`/admin/formations/${formationId}/modifier`}>
                  <Button className="w-full justify-start" variant="outline">
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier la formation
                  </Button>
                </Link>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setShowEnrolledUsers((prev) => !prev)}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {showEnrolledUsers
                    ? "Masquer les inscrits"
                    : "Voir les inscrits"}
                </Button>
                <Button
                  className="w-full justify-start"
                  variant="outline"
                  onClick={() => setShowStatistics((prev) => !prev)}
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  {showStatistics
                    ? "Masquer les statistiques"
                    : "Voir les statistiques"}
                </Button>
              </div>
            </div>

            {showEnrolledUsers && (
              <div className="bg-[hsl(var(--card))] rounded-2xl shadow-sm border border-[hsl(var(--border))] p-6">
                <h3 className="text-lg font-bold text-[hsl(var(--foreground))] mb-1">
                  Liste des inscrits
                </h3>
                <p className="text-sm text-[hsl(var(--muted-foreground))] mb-4">
                  {enrolledUsers.length} personne
                  {enrolledUsers.length > 1 ? "s" : ""} ayant achete cette
                  formation.
                </p>

                {enrolledUsers.length === 0 ? (
                  <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-4 text-sm text-[hsl(var(--muted-foreground))]">
                    Aucun inscrit pour le moment.
                  </div>
                ) : (
                  <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                    {enrolledUsers.map((enrollment) => (
                      <div
                        key={enrollment.id}
                        className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--background))] p-3"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[hsl(var(--foreground))] truncate">
                              {enrollment.user?.full_name?.trim() ||
                                "Utilisateur sans nom"}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] truncate">
                              {enrollment.user?.id || enrollment.user_id}
                            </p>
                            <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                              Inscrit le {formatDate(enrollment.enrolled_at)}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                              {Number(enrollment.progress || 0)}%
                            </p>
                            {enrollment.completed_at ? (
                              <p className="text-xs text-emerald-500 mt-1">
                                Termine
                              </p>
                            ) : (
                              <p className="text-xs text-[hsl(var(--muted-foreground))] mt-1">
                                En cours
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
