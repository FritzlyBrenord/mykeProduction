import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

type LessonItem = {
  id: string;
};

type ModuleItem = {
  id: string;
  formation_lecons?: LessonItem[] | null;
};

type ProgressRow = {
  lecon_id: string;
  completed: boolean | null;
  watched_at: string | null;
};

type ProgressPayload = {
  completed_lessons: string[];
  completed_modules: string[];
  current_lesson: string | null;
  current_module: string | null;
  overall_progress: number;
  time_spent_minutes: number;
  last_accessed_at: string | null;
};

function isVisible(value: boolean | null | undefined) {
  return value !== false;
}

function extractVisibleModules(formation: {
  formation_modules?: (ModuleItem & {
    is_visible?: boolean | null;
    formation_lecons?: (LessonItem & { is_visible?: boolean | null })[] | null;
  })[] | null;
}) {
  return (formation.formation_modules ?? [])
    .filter((module) => isVisible(module.is_visible))
    .map((module) => ({
      ...module,
      formation_lecons: (module.formation_lecons ?? []).filter((lesson) =>
        isVisible(lesson.is_visible),
      ),
    }));
}

function computeProgress(
  modules: ModuleItem[],
  rows: ProgressRow[],
): ProgressPayload {
  const lessonToModule = new Map<string, string>();
  const lessonIds: string[] = [];

  for (const moduleItem of modules) {
    for (const lesson of moduleItem.formation_lecons ?? []) {
      lessonToModule.set(lesson.id, moduleItem.id);
      lessonIds.push(lesson.id);
    }
  }

  const lessonIdSet = new Set(lessonIds);
  const completedLessonsSet = new Set(
    rows
      .filter((row) => row.completed && lessonIdSet.has(row.lecon_id))
      .map((row) => row.lecon_id),
  );

  const completedModules: string[] = [];
  for (const moduleItem of modules) {
    const moduleLessons = (moduleItem.formation_lecons ?? []).map((lesson) => lesson.id);
    if (
      moduleLessons.length > 0 &&
      moduleLessons.every((lessonId) => completedLessonsSet.has(lessonId))
    ) {
      completedModules.push(moduleItem.id);
    }
  }

  const latestRow = rows
    .filter((row) => lessonIdSet.has(row.lecon_id) && !!row.watched_at)
    .sort((a, b) => {
      const aTime = new Date(a.watched_at as string).getTime();
      const bTime = new Date(b.watched_at as string).getTime();
      return bTime - aTime;
    })[0];

  const currentLesson = latestRow?.lecon_id ?? null;
  const currentModule = currentLesson ? lessonToModule.get(currentLesson) ?? null : null;
  const totalLessons = lessonIds.length;
  const overallProgress =
    totalLessons === 0
      ? 0
      : Math.round((completedLessonsSet.size / totalLessons) * 100);

  return {
    completed_lessons: [...completedLessonsSet],
    completed_modules: completedModules,
    current_lesson: currentLesson,
    current_module: currentModule,
    overall_progress: overallProgress,
    time_spent_minutes: 0,
    last_accessed_at: latestRow?.watched_at ?? null,
  };
}

async function getFormationForLearning(supabase: Awaited<ReturnType<typeof createClient>>, slug: string) {
  return supabase
    .from("formations")
    .select(
      `
      *,
      formation_modules (
        id,
        title,
        order_index,
        intro_type,
        intro_text,
        intro_video_url,
        intro_video_type,
        is_visible,
        formation_lecons (
          id,
          title,
          order_index,
          content,
          video_url,
          video_type,
          duration_min,
          is_preview,
          is_visible
        )
      )
    `,
    )
    .eq("slug", slug)
    .eq("status", "published")
    .single();
}

async function getProgressRows(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  lessonIds: string[],
) {
  if (lessonIds.length === 0) {
    return { data: [] as ProgressRow[], error: null };
  }

  return supabase
    .from("lecon_progress")
    .select("lecon_id, completed, watched_at")
    .eq("user_id", userId)
    .in("lecon_id", lessonIds);
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { data: formation, error: formationError } =
      await getFormationForLearning(supabase, slug);

    if (formationError || !formation) {
      return NextResponse.json({ error: "Formation non trouvee" }, { status: 404 });
    }

    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, user_id, formation_id, progress, completed_at")
      .eq("user_id", user.id)
      .eq("formation_id", formation.id)
      .single();

    let enrollment = enrollmentData;
    if (!enrollment) {
      const canAutoEnroll = formation.is_free && enrollmentError?.code === "PGRST116";
      if (canAutoEnroll) {
        const { data: createdEnrollment, error: createEnrollmentError } = await supabase
          .from("enrollments")
          .upsert(
            {
              user_id: user.id,
              formation_id: formation.id,
              progress: 0,
            },
            { onConflict: "user_id,formation_id" },
          )
          .select("id, user_id, formation_id, progress, completed_at")
          .single();

        if (createEnrollmentError || !createdEnrollment) {
          return NextResponse.json(
            { error: "Impossible de creer l'inscription gratuite" },
            { status: 500 },
          );
        }

        enrollment = createdEnrollment;
      } else {
        return NextResponse.json(
          { error: "Non inscrit a cette formation" },
          { status: 403 },
        );
      }
    }

    const visibleModules = extractVisibleModules(formation);
    const lessonIds = visibleModules.flatMap((module) =>
      (module.formation_lecons ?? []).map((lesson) => lesson.id),
    );

    const { data: rows, error: progressError } = await getProgressRows(
      supabase,
      user.id,
      lessonIds,
    );

    if (progressError) {
      return NextResponse.json(
        {
          error: "Erreur recuperation progression",
          details: progressError.message,
          code: progressError.code,
        },
        { status: 500 },
      );
    }

    const progress = computeProgress(visibleModules, rows ?? []);

    if (Number(enrollment.progress ?? 0) !== progress.overall_progress) {
      await supabase
        .from("enrollments")
        .update({
          progress: progress.overall_progress,
          completed_at:
            progress.overall_progress === 100
              ? enrollment.completed_at ?? new Date().toISOString()
              : enrollment.completed_at,
        })
        .eq("id", enrollment.id);
    }

    return NextResponse.json({
      formation: {
        ...formation,
        formation_modules: visibleModules,
      },
      progress,
      enrollment: {
        ...enrollment,
        progress: progress.overall_progress,
        completed_at:
          progress.overall_progress === 100
            ? enrollment.completed_at ?? new Date().toISOString()
            : enrollment.completed_at,
      },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const action = body?.action === "access" ? "access" : "complete";
    const lessonId =
      typeof body?.lesson_id === "string" ? body.lesson_id.trim() : "";

    if (!lessonId) {
      return NextResponse.json({ error: "lesson_id requis" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifie" }, { status: 401 });
    }

    const { data: formation, error: formationError } =
      await getFormationForLearning(supabase, slug);

    if (formationError || !formation) {
      return NextResponse.json({ error: "Formation non trouvee" }, { status: 404 });
    }

    const { data: enrollmentData, error: enrollmentError } = await supabase
      .from("enrollments")
      .select("id, user_id, formation_id, progress, completed_at")
      .eq("user_id", user.id)
      .eq("formation_id", formation.id)
      .single();

    let enrollment = enrollmentData;
    if (!enrollment) {
      const canAutoEnroll = formation.is_free && enrollmentError?.code === "PGRST116";
      if (canAutoEnroll) {
        const { data: createdEnrollment, error: createEnrollmentError } = await supabase
          .from("enrollments")
          .upsert(
            {
              user_id: user.id,
              formation_id: formation.id,
              progress: 0,
            },
            { onConflict: "user_id,formation_id" },
          )
          .select("id, user_id, formation_id, progress, completed_at")
          .single();

        if (createEnrollmentError || !createdEnrollment) {
          return NextResponse.json(
            { error: "Impossible de creer l'inscription gratuite" },
            { status: 500 },
          );
        }

        enrollment = createdEnrollment;
      } else {
        return NextResponse.json(
          { error: "Non inscrit a cette formation" },
          { status: 403 },
        );
      }
    }

    const visibleModules = extractVisibleModules(formation);
    const lessonToModule = new Map<string, string>();
    const lessonIds = visibleModules.flatMap((module) => {
      const ids = (module.formation_lecons ?? []).map((lesson) => lesson.id);
      for (const id of ids) lessonToModule.set(id, module.id);
      return ids;
    });

    if (!lessonToModule.has(lessonId)) {
      return NextResponse.json(
        { error: "Lecon invalide pour cette formation" },
        { status: 400 },
      );
    }

    if (action === "access") {
      const { error: upsertError } = await supabase
        .from("lecon_progress")
        .upsert(
          {
            user_id: user.id,
            lecon_id: lessonId,
            watched_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lecon_id" },
        );

      if (upsertError) {
        return NextResponse.json(
          { error: "Erreur mise a jour progression", details: upsertError.message },
          { status: 500 },
        );
      }
    } else {
      const { error: upsertError } = await supabase
        .from("lecon_progress")
        .upsert(
          {
            user_id: user.id,
            lecon_id: lessonId,
            completed: true,
            watched_at: new Date().toISOString(),
          },
          { onConflict: "user_id,lecon_id" },
        );

      if (upsertError) {
        return NextResponse.json(
          { error: "Erreur mise a jour progression", details: upsertError.message },
          { status: 500 },
        );
      }
    }

    const { data: rows, error: progressError } = await getProgressRows(
      supabase,
      user.id,
      lessonIds,
    );

    if (progressError) {
      return NextResponse.json(
        {
          error: "Erreur recuperation progression",
          details: progressError.message,
          code: progressError.code,
        },
        { status: 500 },
      );
    }

    const progress = computeProgress(visibleModules, rows ?? []);
    const completedAt =
      progress.overall_progress === 100
        ? enrollment.completed_at ?? new Date().toISOString()
        : enrollment.completed_at;

    await supabase
      .from("enrollments")
      .update({
        progress: progress.overall_progress,
        completed_at: completedAt,
      })
      .eq("id", enrollment.id);

    return NextResponse.json(progress);
  } catch (error) {
    return NextResponse.json(
      {
        error: "Erreur serveur",
        details: error instanceof Error ? error.message : "Erreur inconnue",
      },
      { status: 500 },
    );
  }
}
