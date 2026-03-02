import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { cookies } from "next/headers";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const resolvedParams = await params;
    const slug = resolvedParams.slug;
    console.log("Test API - Slug reçu:", slug);
    
    const cookieStore = await cookies();
    const supabase = await createClient(cookieStore);
    console.log("Test API - Client Supabase créé:", !!supabase);

    // Test simple : chercher toutes les formations
    console.log("Test API - Recherche TOUTES les formations");
    const { data: allFormations, error: allError } = await supabase
      .from("formations")
      .select("id, title, slug, status")
      .limit(10);

    console.log("Test API - Toutes les formations:", {
      count: allFormations?.length,
      error: allError?.message,
      formations: allFormations?.map(f => ({ id: f.id, title: f.title, slug: f.slug, status: f.status }))
    });

    // Test : chercher la formation spécifique
    console.log("Test API - Recherche formation spécifique:", slug);
    const { data: formation, error: formationError } = await supabase
      .from("formations")
      .select("id, title, slug, status, created_at")
      .eq("slug", slug)
      .single();

    console.log("Test API - Formation spécifique:", {
      found: !!formation,
      error: formationError?.message,
      errorCode: formationError?.code,
      formation: formation
    });

    // Test : chercher sans filtre de status
    console.log("Test API - Recherche SANS status filter");
    const { data: formationNoStatus, error: noStatusError } = await supabase
      .from("formations")
      .select("id, title, slug, status")
      .eq("slug", slug)
      .single();

    console.log("Test API - Formation sans status:", {
      found: !!formationNoStatus,
      error: noStatusError?.message,
      formation: formationNoStatus
    });

    return NextResponse.json({
      slug,
      allFormationsCount: allFormations?.length || 0,
      allFormations: allFormations?.map(f => ({ id: f.id, title: f.title, slug: f.slug, status: f.status })),
      formation,
      formationNoStatus,
      errors: {
        allError: allError?.message,
        formationError: formationError?.message,
        noStatusError: noStatusError?.message
      }
    });
  } catch (error) {
    console.error("Test API - Erreur:", error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : "Erreur inconnue" 
    }, { status: 500 });
  }
}
