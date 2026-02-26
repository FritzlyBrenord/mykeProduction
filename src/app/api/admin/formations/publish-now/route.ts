import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

/**
 * Endpoint pour forcer la publication des formations planifiées
 * Publie toutes les formations où scheduled_publish_at <= maintenant
 */
export async function POST(request: NextRequest) {
  try {
    const now = new Date().toISOString();

    console.log(`[API] Vérification des formations à publier - ${now}`);

    // Récupérer toutes les formations planifiées dont l'heure est arrivée
    const { data: scheduledFormations, error: fetchError } = await supabaseAdmin
      .from("formations")
      .select("id, title, scheduled_publish_at, scheduled_timezone, status")
      .eq("status", "scheduled")
      .not("scheduled_publish_at", "is", null)
      .lte("scheduled_publish_at", now)
      .order("scheduled_publish_at", { ascending: true });

    if (fetchError) {
      console.error("[API] Erreur fetch:", fetchError);
      return NextResponse.json(
        { error: "Erreur lors de la récupération des formations", details: fetchError },
        { status: 500 }
      );
    }

    if (!scheduledFormations || scheduledFormations.length === 0) {
      console.log("[API] Aucune formation à publier");
      return NextResponse.json(
        { message: "Aucune formation à publier", count: 0 },
        { status: 200 }
      );
    }

    console.log(`[API] ${scheduledFormations.length} formation(s) à publier`);

    // Publier chaque formation
    const publishResults = [];
    for (const formation of scheduledFormations) {
      const publishedAt = new Date().toISOString();

      console.log(`[API] Publication de: ${formation.id} (${formation.title})`);

      const { error: updateError } = await supabaseAdmin
        .from("formations")
        .update({
          status: "published",
          published_at: publishedAt,
          updated_at: publishedAt,
        })
        .eq("id", formation.id);

      if (updateError) {
        console.error(`[API] Erreur lors de la publication de ${formation.id}:`, updateError);
        continue;
      }

      // Log audit
      const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
        action: "update",
        table_name: "formations",
        record_id: formation.id,
        changes: {
          status: "scheduled → published",
          published_at: publishedAt,
        },
      });

      if (auditError) {
        console.warn(`[API] Erreur audit log pour ${formation.id}:`, auditError);
      }

      console.log(`[API] ✅ Formation publiée: ${formation.id}`);

      publishResults.push({
        id: formation.id,
        title: formation.title,
        scheduledTime: formation.scheduled_publish_at,
        publishedAt,
      });
    }

    console.log(`[API] Résultat: ${publishResults.length} formation(s) publiée(s)`);

    return NextResponse.json(
      {
        message: `${publishResults.length} formation(s) publiée(s)`,
        count: publishResults.length,
        published: publishResults,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[API] Erreur non gérée:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error?.message },
      { status: 500 }
    );
  }
}
