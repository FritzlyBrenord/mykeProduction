import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    console.log("Debug API - Slug reçu:", slug);
    
    const supabase = await createClient();
    console.log("Debug API - Client Supabase créé:", !!supabase);

    // Vérifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log("Debug API - Auth check:", { user: !!user, error: authError?.message });
    
    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifié" }, { status: 401 });
    }

    // Test simple : chercher la formation
    console.log("Debug API - Recherche formation simple");
    const { data: formation, error: formationError } = await supabase
      .from("formations")
      .select("id, title, slug, status")
      .eq("slug", slug)
      .single();

    console.log("Debug API - Formation simple:", {
      found: !!formation,
      error: formationError?.message,
      errorCode: formationError?.code,
      formation: formation
    });

    // Test : chercher les modules de la formation
    if (formation) {
      console.log("Debug API - Recherche modules pour formation:", formation.id);
      const { data: modules, error: modulesError } = await supabase
        .from("formation_modules")
        .select("id, title, is_visible")
        .eq("formation_id", formation.id);

      console.log("Debug API - Modules:", {
        count: modules?.length || 0,
        error: modulesError?.message,
        modules: modules
      });

      // Test : chercher les leçons pour chaque module
      if (modules && modules.length > 0) {
        for (const moduleRow of modules) {
          console.log("Debug API - Recherche leçons pour module:", moduleRow.id);
          const { data: lessons, error: lessonsError } = await supabase
            .from("formation_lecons")
            .select("id, title, is_visible")
            .eq("module_id", moduleRow.id);

          console.log("Debug API - Leçons pour module " + moduleRow.id + ":", {
            count: lessons?.length || 0,
            error: lessonsError?.message,
            lessons: lessons
          });
        }
      }
    }

    // Test : vérifier si table lecon_progress existe
    console.log("Debug API - Test table lecon_progress");
    try {
      const { data: progressTest, error: progressTestError } = await supabase
        .from("lecon_progress")
        .select("id")
        .limit(1);

      console.log("Debug API - Table lecon_progress test:", {
        exists: !progressTestError,
        error: progressTestError?.message,
        errorCode: progressTestError?.code
      });
    } catch (testError) {
      console.error("Debug API - Exception test table:", testError);
    }

    // Test : vérifier l'inscription
    if (formation) {
      console.log("Debug API - Test enrollment");
      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id, enrolled_at, progress")
        .eq("user_id", user.id)
        .eq("formation_id", formation.id)
        .single();

      console.log("Debug API - Enrollment:", {
        found: !!enrollment,
        error: enrollmentError?.message,
        enrollment: enrollment
      });
    }

    return NextResponse.json({
      success: true,
      slug,
      formation,
      auth: { user: !!user, userId: user?.id }
    });
  } catch (error) {
    console.error("Debug API - Erreur:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erreur inconnue",
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
