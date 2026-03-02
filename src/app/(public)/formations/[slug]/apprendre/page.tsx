"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock3,
  FileText,
  Medal,
  PlayCircle,
  RefreshCw,
  Sparkles,
  Target,
  Trophy,
  Video,
} from "lucide-react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

type VideoType = "upload" | "youtube" | "vimeo" | null;

interface Lesson {
  id: string;
  title: string;
  content: string | null;
  video_url: string | null;
  video_type: VideoType;
  duration_min: number | null;
  is_preview: boolean;
  is_visible?: boolean;
  order_index?: number;
}

interface ModuleItem {
  id: string;
  title: string;
  intro_type: "text" | "video" | null;
  intro_text: string | null;
  intro_video_url: string | null;
  intro_video_type: VideoType;
  is_visible?: boolean;
  order_index?: number;
  formation_lecons: Lesson[];
}

interface Formation {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  content: string | null;
  thumbnail_url: string | null;
  format: "video" | "text";
  level: string;
  language: string;
  duration_hours: number;
  certificate: boolean;
  formation_modules: ModuleItem[];
}

interface ProgressData {
  completed_lessons: string[];
  completed_modules: string[];
  current_lesson: string | null;
  current_module: string | null;
  overall_progress: number;
  time_spent_minutes: number;
  last_accessed_at: string | null;
}

interface ApiResponse {
  formation: Formation;
  progress: ProgressData;
}

interface LessonTrackItem {
  module: ModuleItem;
  lesson: Lesson;
  moduleIndex: number;
  lessonIndex: number;
}

function levelLabel(level: string) {
  switch (level) {
    case "debutant":
      return "Debutant";
    case "intermediaire":
      return "Intermediaire";
    case "avance":
      return "Avance";
    default:
      return "Tous niveaux";
  }
}

function formatDuration(minutes: number | null) {
  if (!minutes || minutes <= 0) return "Duree non specifiee";
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours <= 0) return `${mins} min`;
  return mins > 0 ? `${hours}h ${mins}min` : `${hours}h`;
}

function safeModules(input: ModuleItem[] | undefined) {
  const modules = (input ?? [])
    .filter((module) => module.is_visible !== false)
    .map((module) => ({
      ...module,
      formation_lecons: (module.formation_lecons ?? []).filter(
        (lesson) => lesson.is_visible !== false,
      ),
    }))
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));

  return modules.map((module) => ({
    ...module,
    formation_lecons: [...module.formation_lecons].sort(
      (a, b) => (a.order_index ?? 0) - (b.order_index ?? 0),
    ),
  }));
}

function getYouTubeId(url: string) {
  return url.match(
    /(?:youtu\.be\/|youtube\.com\/(?:[^/]+\/.+\/|(?:v|e(?:mbed)?)\/).*[?&]v=)([^&\n?#]+)/,
  )?.[1];
}

function getVimeoId(url: string) {
  return url.match(/vimeo\.com\/(\d+)/)?.[1];
}

function VideoPlayer({
  type,
  url,
  title,
}: {
  type: VideoType;
  url: string | null;
  title: string;
}) {
  if (!url) {
    return (
      <div className="aspect-video w-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/60 p-6 text-zinc-600">
        Aucune video pour cette lecon.
      </div>
    );
  }

  if (type === "upload") {
    return (
      <video
        controls
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
        className="aspect-video w-full rounded-2xl border border-white/20 bg-black"
        src={url}
        title={title}
      >
        Votre navigateur ne supporte pas la video.
      </video>
    );
  }

  if (type === "youtube") {
    const id = getYouTubeId(url);
    if (id) {
      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-white/20"
          src={`https://www.youtube.com/embed/${id}`}
          title={title}
          allowFullScreen
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        />
      );
    }
  }

  if (type === "vimeo") {
    const id = getVimeoId(url);
    if (id) {
      return (
        <iframe
          className="aspect-video w-full rounded-2xl border border-white/20"
          src={`https://player.vimeo.com/video/${id}`}
          title={title}
          allowFullScreen
        />
      );
    }
  }

  return (
    <div className="aspect-video w-full rounded-2xl border border-dashed border-zinc-300 bg-zinc-100/60 p-6 text-zinc-600">
      Format video non supporte.
    </div>
  );
}

export default function FormationLearningPage() {
  const params = useParams<{ slug: string }>();
  const router = useRouter();
  const slug = Array.isArray(params?.slug)
    ? params.slug[0]
    : (params?.slug ?? "");

  const [formation, setFormation] = useState<Formation | null>(null);
  const [progress, setProgress] = useState<ProgressData | null>(null);
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [markingComplete, setMarkingComplete] = useState(false);

  const modules = useMemo(
    () => safeModules(formation?.formation_modules),
    [formation?.formation_modules],
  );

  const lessonTrack = useMemo<LessonTrackItem[]>(
    () =>
      modules.flatMap((module, moduleIndex) =>
        module.formation_lecons.map((lesson, lessonIndex) => ({
          module,
          lesson,
          moduleIndex,
          lessonIndex,
        })),
      ),
    [modules],
  );

  const selectedTrackItem = useMemo(
    () =>
      lessonTrack.find((item) => item.lesson.id === selectedLessonId) ?? null,
    [lessonTrack, selectedLessonId],
  );

  const selectedModuleIntro = useMemo(() => {
    if (!selectedTrackItem) return null;
    const moduleItem = selectedTrackItem.module;
    const textIntro =
      moduleItem.intro_type === "text"
        ? (moduleItem.intro_text?.trim() ?? "")
        : "";
    const videoIntroUrl =
      moduleItem.intro_type === "video"
        ? (moduleItem.intro_video_url?.trim() ?? "")
        : "";

    if (textIntro) {
      return {
        type: "text" as const,
        text: textIntro,
        url: null,
        videoType: null as VideoType,
      };
    }

    if (videoIntroUrl) {
      return {
        type: "video" as const,
        text: null,
        url: videoIntroUrl,
        videoType: moduleItem.intro_video_type,
      };
    }

    return null;
  }, [selectedTrackItem]);

  const completedLessonsSet = useMemo(
    () => new Set(progress?.completed_lessons ?? []),
    [progress?.completed_lessons],
  );

  const completedModulesSet = useMemo(
    () => new Set(progress?.completed_modules ?? []),
    [progress?.completed_modules],
  );

  const stats = useMemo(() => {
    const totalLessons = lessonTrack.length;
    const completedLessons = completedLessonsSet.size;
    const totalModules = modules.length;
    const completedModules = completedModulesSet.size;
    return { totalLessons, completedLessons, totalModules, completedModules };
  }, [
    completedLessonsSet,
    completedModulesSet,
    lessonTrack.length,
    modules.length,
  ]);

  const currentLessonIndex = useMemo(
    () => lessonTrack.findIndex((item) => item.lesson.id === selectedLessonId),
    [lessonTrack, selectedLessonId],
  );

  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      if (!slug) {
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const response = await fetch(
          `/api/formations/${encodeURIComponent(slug)}/progress`,
        );
        if (!response.ok) {
          const text = await response.text();
          if (response.status === 404)
            throw new Error("Formation introuvable.");
          if (response.status === 403)
            throw new Error("Acces refuse a cette formation.");
          if (response.status === 401) throw new Error("Connexion requise.");
          throw new Error(text || "Erreur de chargement.");
        }

        const data: ApiResponse = await response.json();
        if (cancelled) return;

        setFormation(data.formation);
        setProgress(data.progress);

        const localModules = safeModules(data.formation.formation_modules);
        const localTrack = localModules.flatMap(
          (module) => module.formation_lecons,
        );

        if (
          data.progress?.current_lesson &&
          localTrack.some(
            (lesson) => lesson.id === data.progress.current_lesson,
          )
        ) {
          setSelectedLessonId(data.progress.current_lesson);
        } else if (localTrack.length > 0) {
          setSelectedLessonId(localTrack[0].id);
        } else {
          setSelectedLessonId(null);
        }
      } catch (error) {
        console.error("Erreur chargement apprentissage:", error);
        toast.error(
          error instanceof Error
            ? error.message
            : "Impossible de charger la formation.",
        );
        router.push("/formations");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [router, slug]);

  const selectLesson = (lessonId: string) => {
    const item = lessonTrack.find((entry) => entry.lesson.id === lessonId);
    if (!item) return;

    setSelectedLessonId(lessonId);
    setProgress((prev) =>
      prev
        ? {
            ...prev,
            current_lesson: item.lesson.id,
            current_module: item.module.id,
            last_accessed_at: new Date().toISOString(),
          }
        : prev,
    );

    fetch(`/api/formations/${encodeURIComponent(slug)}/progress`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "access",
        lesson_id: item.lesson.id,
        module_id: item.module.id,
      }),
    }).catch((error) => {
      console.error("Erreur access progression:", error);
    });
  };

  const goToNeighborLesson = (offset: -1 | 1) => {
    if (currentLessonIndex < 0) return;
    const nextIndex = currentLessonIndex + offset;
    if (nextIndex < 0 || nextIndex >= lessonTrack.length) return;
    selectLesson(lessonTrack[nextIndex].lesson.id);
  };

  const markCurrentLessonAsComplete = async () => {
    if (!selectedTrackItem) return;

    try {
      setMarkingComplete(true);
      const response = await fetch(
        `/api/formations/${encodeURIComponent(slug)}/progress`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "complete",
            lesson_id: selectedTrackItem.lesson.id,
            module_id: selectedTrackItem.module.id,
          }),
        },
      );

      if (!response.ok) {
        const message = await response.text();
        throw new Error(
          message || "Impossible de mettre a jour la progression.",
        );
      }

      const nextProgress: ProgressData = await response.json();
      setProgress(nextProgress);
      toast.success("Lecon marquee comme terminee.");

      const nextIndex = currentLessonIndex + 1;
      if (nextIndex >= 0 && nextIndex < lessonTrack.length) {
        setSelectedLessonId(lessonTrack[nextIndex].lesson.id);
      }
    } catch (error) {
      console.error("Erreur completion lecon:", error);
      toast.error("La progression n'a pas pu etre mise a jour.");
    } finally {
      setMarkingComplete(false);
    }
  };

  const headingStyle = {
    fontFamily: "'Palatino Linotype', 'Book Antiqua', Palatino, serif",
  };
  const bodyStyle = {
    fontFamily:
      "'Trebuchet MS', 'Lucida Sans Unicode', 'Lucida Grande', sans-serif",
  };

  if (isLoading) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[hsl(var(--cream))]"
        style={bodyStyle}
      >
        <div className="space-y-4 text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-[hsl(var(--gold))] border-t-transparent" />
          <p className="text-sm tracking-wide text-zinc-600">
            Preparation de votre espace d&apos;apprentissage...
          </p>
        </div>
      </div>
    );
  }

  if (!formation) {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-[hsl(var(--cream))]"
        style={bodyStyle}
      >
        <Card className="w-full max-w-md border-zinc-200 shadow-xl">
          <CardContent className="space-y-4 p-8 text-center">
            <BookOpen className="mx-auto h-12 w-12 text-zinc-400" />
            <h2
              className="text-xl font-semibold text-zinc-900"
              style={headingStyle}
            >
              Formation introuvable
            </h2>
            <p className="text-sm text-zinc-600">
              Cette formation n&apos;est pas disponible ou votre acces a expire.
            </p>
            <Link href="/formations">
              <Button className="w-full bg-[hsl(var(--navy))] text-white hover:bg-[hsl(var(--navy-light))]">
                Retour au catalogue
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen overflow-hidden bg-[hsl(var(--cream))]"
      style={bodyStyle}
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-16 h-72 w-72 rounded-full bg-[hsl(var(--gold)/0.16)] blur-3xl" />
        <div className="absolute right-0 top-0 h-80 w-80 rounded-full bg-[hsl(var(--navy)/0.1)] blur-3xl" />
      </div>

      <div className="relative mx-auto max-w-7xl px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="mb-4">
            <Link href="/compte/formations">
              <Button
                variant="outline"
                className="border-[hsl(var(--navy)/0.25)] bg-white/80 text-[hsl(var(--navy))] backdrop-blur hover:bg-white"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Mes formations
              </Button>
            </Link>
          </div>

          <div className="relative overflow-hidden rounded-3xl border border-[hsl(var(--navy)/0.2)] bg-[linear-gradient(120deg,hsl(var(--navy))_0%,hsl(var(--navy-light))_60%,hsl(var(--navy))_100%)] p-6 text-white shadow-2xl sm:p-8">
            <div className="absolute right-0 top-0 h-36 w-36 rounded-full bg-[hsl(var(--gold)/0.25)] blur-2xl" />
            <div className="relative space-y-4">
              <div
                className={`grid items-start gap-6 ${
                  selectedModuleIntro
                    ? "lg:grid-cols-[1.05fr_0.95fr]"
                    : "lg:grid-cols-1"
                }`}
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs uppercase tracking-[0.2em] text-white/90">
                    <Sparkles className="h-3.5 w-3.5 text-[hsl(var(--gold-light))]" />
                    Experience premium
                  </div>
                  <h1
                    className="text-3xl font-semibold leading-tight sm:text-4xl"
                    style={headingStyle}
                  >
                    {formation.title}
                  </h1>
                  {formation.description ? (
                    <p className="max-w-2xl text-sm text-white/80 sm:text-base">
                      {formation.description}
                    </p>
                  ) : null}
                  <div className="flex flex-wrap gap-2">
                    <Badge className="bg-white/15 text-white backdrop-blur">
                      {levelLabel(formation.level)}
                    </Badge>
                    <Badge className="bg-white/15 text-white backdrop-blur">
                      {formation.format === "video" ? "Video" : "Texte"}
                    </Badge>
                    <Badge className="bg-white/15 text-white backdrop-blur uppercase">
                      {formation.language}
                    </Badge>
                    <Badge className="bg-white/15 text-white backdrop-blur">
                      {formation.certificate ? "Certificat inclus" : "Sans certificat"}
                    </Badge>
                  </div>
                  {selectedTrackItem ? (
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs text-white/90">
                      <PlayCircle className="h-3.5 w-3.5 text-[hsl(var(--gold-light))]" />
                      Module {selectedTrackItem.moduleIndex + 1} - Lecon{" "}
                      {selectedTrackItem.lessonIndex + 1}
                    </div>
                  ) : null}
                </div>

                {selectedModuleIntro ? (
                  <div className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/85">
                      Introduction du module
                    </p>
                    {selectedModuleIntro.type === "video" ? (
                      <VideoPlayer
                        type={selectedModuleIntro.videoType}
                        url={selectedModuleIntro.url}
                        title={`Introduction - ${selectedTrackItem?.module.title ?? formation.title}`}
                      />
                    ) : (
                      <p className="line-clamp-5 text-sm leading-relaxed text-white/90">
                        {selectedModuleIntro.text}
                      </p>
                    )}
                  </div>
                ) : null}
              </div>

              <div className="rounded-2xl border border-white/15 bg-white/10 p-5 backdrop-blur">
                <div className="mb-3 flex items-center justify-between text-sm text-white/80">
                  <span className="inline-flex items-center gap-2">
                    <Target className="h-4 w-4 text-[hsl(var(--gold-light))]" />
                    Progression globale
                  </span>
                  <span className="font-semibold text-white">
                    {Math.round(progress?.overall_progress ?? 0)}%
                  </span>
                </div>
                <Progress
                  value={progress?.overall_progress ?? 0}
                  className="h-2 bg-white/20"
                />
                <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                    <div className="text-white/70">Lecons</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {stats.completedLessons}/{stats.totalLessons}
                    </div>
                  </div>
                  <div className="rounded-xl border border-white/15 bg-white/10 p-3">
                    <div className="text-white/70">Modules</div>
                    <div className="mt-1 text-lg font-semibold text-white">
                      {stats.completedModules}/{stats.totalModules}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.header>

        <div className="grid gap-6 lg:grid-cols-12">
          <motion.main
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.05 }}
            className="space-y-6 lg:col-span-8"
          >
            {selectedTrackItem ? (
              <Card className="overflow-hidden border-[hsl(var(--navy)/0.15)] shadow-xl">
                <CardContent className="p-0">
                  <div className="border-b border-zinc-200/80 bg-white px-5 py-4 sm:px-6">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-100 px-3 py-1 text-xs font-medium text-zinc-600">
                          <PlayCircle className="h-3.5 w-3.5 text-[hsl(var(--gold))]" />
                          Module {selectedTrackItem.moduleIndex + 1} - Lecon{" "}
                          {selectedTrackItem.lessonIndex + 1}
                        </div>
                        <h2
                          className="text-2xl font-semibold text-[hsl(var(--navy))]"
                          style={headingStyle}
                        >
                          {selectedTrackItem.lesson.title}
                        </h2>
                        <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-500">
                          <span className="inline-flex items-center gap-1.5">
                            <Clock3 className="h-4 w-4" />
                            {formatDuration(
                              selectedTrackItem.lesson.duration_min,
                            )}
                          </span>
                          {selectedTrackItem.lesson.is_preview ? (
                            <Badge variant="secondary">Apercu</Badge>
                          ) : null}
                          {completedLessonsSet.has(
                            selectedTrackItem.lesson.id,
                          ) ? (
                            <Badge className="border border-emerald-200 bg-emerald-50 text-emerald-700">
                              <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                              Terminee
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <Button
                        onClick={markCurrentLessonAsComplete}
                        disabled={
                          markingComplete ||
                          completedLessonsSet.has(selectedTrackItem.lesson.id)
                        }
                        className="min-w-44 bg-[hsl(var(--gold))] text-[hsl(var(--navy))] hover:bg-[hsl(var(--gold-light))]"
                      >
                        {markingComplete ? (
                          <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="mr-2 h-4 w-4" />
                        )}
                        {completedLessonsSet.has(selectedTrackItem.lesson.id)
                          ? "Lecon terminee"
                          : "Marquer terminee"}
                      </Button>
                    </div>
                  </div>

                  <div className="space-y-5 bg-zinc-50 px-4 py-5 sm:px-6">
                    <VideoPlayer
                      type={selectedTrackItem.lesson.video_type}
                      url={selectedTrackItem.lesson.video_url}
                      title={selectedTrackItem.lesson.title}
                    />

                    <Tabs defaultValue="lesson" className="w-full">
                      <TabsList className="grid w-full grid-cols-2 bg-zinc-200/70 text-zinc-700">
                        <TabsTrigger
                          value="lesson"
                          className="text-zinc-700 data-[state=active]:text-zinc-900"
                        >
                          Contenu
                        </TabsTrigger>
                        <TabsTrigger
                          value="resources"
                          className="text-zinc-700 data-[state=active]:text-zinc-900"
                        >
                          Ressources
                        </TabsTrigger>
                      </TabsList>

                      <TabsContent
                        value="lesson"
                        className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-800 sm:p-5"
                      >
                        {selectedTrackItem.lesson.content ? (
                          <div className="prose max-w-none prose-zinc">
                            <div
                              dangerouslySetInnerHTML={{
                                __html: selectedTrackItem.lesson.content,
                              }}
                            />
                          </div>
                        ) : (
                          <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-6 text-center text-zinc-600">
                            Aucun contenu texte pour cette lecon.
                          </div>
                        )}
                      </TabsContent>

                      <TabsContent
                        value="resources"
                        className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-zinc-800 sm:p-5"
                      >
                        <div className="flex items-start gap-3 rounded-xl border border-dashed border-zinc-300 bg-zinc-50 p-4 text-sm text-zinc-600">
                          <FileText className="mt-0.5 h-4 w-4 text-zinc-500" />
                          Les ressources telechargeables apparaitront ici
                          lorsque l&apos;equipe pedagogique les ajoutera.
                        </div>
                      </TabsContent>
                    </Tabs>

                    <div className="flex flex-col gap-3 border-t border-zinc-200 pt-4 sm:flex-row sm:justify-between">
                      <Button
                        variant="outline"
                        onClick={() => goToNeighborLesson(-1)}
                        disabled={currentLessonIndex <= 0}
                        className="border-zinc-300 bg-white text-zinc-900 hover:bg-zinc-100"
                      >
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Lecon precedente
                      </Button>
                      <Button
                        onClick={() => goToNeighborLesson(1)}
                        disabled={
                          currentLessonIndex < 0 ||
                          currentLessonIndex >= lessonTrack.length - 1
                        }
                        className="bg-[hsl(var(--navy))] text-white hover:bg-[hsl(var(--navy-light))]"
                      >
                        Lecon suivante
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-zinc-200 shadow-lg">
                <CardContent className="p-10 text-center">
                  <BookOpen className="mx-auto mb-4 h-14 w-14 text-zinc-300" />
                  <h3
                    className="text-2xl font-semibold text-zinc-900"
                    style={headingStyle}
                  >
                    Choisissez une lecon
                  </h3>
                  <p className="mt-2 text-zinc-600">
                    Ouvrez le programme et selectionnez votre premiere lecon
                    pour demarrer.
                  </p>
                </CardContent>
              </Card>
            )}
          </motion.main>

          <motion.aside
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, delay: 0.12 }}
            className="space-y-6 lg:col-span-4"
          >
            <Card className="border-[hsl(var(--navy)/0.15)] shadow-xl lg:sticky lg:top-6">
              <CardContent className="space-y-4 p-4 sm:p-5">
                <div className="flex items-center justify-between">
                  <h3
                    className="text-lg font-semibold text-[hsl(var(--navy))]"
                    style={headingStyle}
                  >
                    Programme de formation
                  </h3>
                  <Badge className="bg-[hsl(var(--navy))] text-white">
                    {stats.totalLessons} lecons
                  </Badge>
                </div>

                <div className="max-h-[58vh] space-y-3 overflow-y-auto pr-1">
                  {modules.map((module, moduleIndex) => {
                    const moduleLessons = module.formation_lecons ?? [];
                    const moduleCompletedCount = moduleLessons.filter(
                      (lesson) => completedLessonsSet.has(lesson.id),
                    ).length;

                    return (
                      <div
                        key={module.id}
                        className="rounded-xl border border-zinc-200 bg-white/70"
                      >
                        <div className="border-b border-zinc-200 px-3 py-2.5">
                          <div className="flex items-center justify-between gap-2">
                            <div>
                              <p className="text-xs uppercase tracking-[0.16em] text-zinc-500">
                                Module {moduleIndex + 1}
                              </p>
                              <div className="flex items-center gap-2">
                                <p className="font-semibold text-zinc-900">
                                  {module.title}
                                </p>
                                {(module.intro_type === "text" &&
                                  !!module.intro_text?.trim()) ||
                                (module.intro_type === "video" &&
                                  !!module.intro_video_url?.trim()) ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    Intro
                                  </Badge>
                                ) : null}
                              </div>
                            </div>
                            {completedModulesSet.has(module.id) ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            ) : null}
                          </div>
                          <p className="mt-1 text-xs text-zinc-500">
                            {moduleCompletedCount}/{moduleLessons.length}{" "}
                            terminees
                          </p>
                        </div>

                        <div className="space-y-1 p-2">
                          {moduleLessons.map((lesson, lessonIndex) => {
                            const isCurrent = lesson.id === selectedLessonId;
                            const isDone = completedLessonsSet.has(lesson.id);
                            return (
                              <button
                                key={lesson.id}
                                onClick={() => selectLesson(lesson.id)}
                                className={`w-full rounded-lg px-2.5 py-2 text-left transition ${
                                  isCurrent
                                    ? "bg-[hsl(var(--navy))] text-white"
                                    : "hover:bg-zinc-100"
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2">
                                  <div className="flex min-w-0 items-center gap-2">
                                    {lesson.video_url ? (
                                      <Video
                                        className={`h-4 w-4 ${isCurrent ? "text-white/90" : "text-zinc-500"}`}
                                      />
                                    ) : (
                                      <FileText
                                        className={`h-4 w-4 ${isCurrent ? "text-white/90" : "text-zinc-500"}`}
                                      />
                                    )}
                                    <span
                                      className={`line-clamp-1 text-sm ${isCurrent ? "text-white" : "text-zinc-700"}`}
                                    >
                                      {lessonIndex + 1}. {lesson.title}
                                    </span>
                                  </div>
                                  {isDone ? (
                                    <CheckCircle2
                                      className={`h-4 w-4 ${isCurrent ? "text-[hsl(var(--gold-light))]" : "text-emerald-600"}`}
                                    />
                                  ) : null}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            <Card className="border-[hsl(var(--navy)/0.15)] bg-white/90 shadow-lg">
              <CardContent className="space-y-3 p-5">
                <h4
                  className="inline-flex items-center gap-2 text-base font-semibold text-[hsl(var(--navy))]"
                  style={headingStyle}
                >
                  <Trophy className="h-4 w-4 text-[hsl(var(--gold))]" />
                  Tableau de bord
                </h4>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-zinc-500">Temps estime</p>
                    <p className="mt-1 font-semibold text-zinc-900">
                      {formation.duration_hours || 0}h
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-zinc-500">Format</p>
                    <p className="mt-1 font-semibold text-zinc-900 capitalize">
                      {formation.format}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-zinc-500">Certificat</p>
                    <p className="mt-1 font-semibold text-zinc-900">
                      {formation.certificate ? "Oui" : "Non"}
                    </p>
                  </div>
                  <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-3">
                    <p className="text-zinc-500">Niveau</p>
                    <p className="mt-1 font-semibold text-zinc-900">
                      {levelLabel(formation.level)}
                    </p>
                  </div>
                </div>
                <div className="rounded-xl border border-[hsl(var(--gold)/0.5)] bg-[hsl(var(--gold)/0.1)] p-3 text-sm text-zinc-700">
                  <p className="inline-flex items-center gap-2 font-medium">
                    <Medal className="h-4 w-4 text-[hsl(var(--gold))]" />
                    Gardez un rythme regulier
                  </p>
                  <p className="mt-1 text-zinc-600">
                    Marquez vos lecons au fur et a mesure pour suivre une
                    progression claire et motivee.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.aside>
        </div>
      </div>
    </div>
  );
}
