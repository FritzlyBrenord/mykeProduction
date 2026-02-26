import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

/**
 * Endpoint pour réinitialiser une formation avec une date planifiée
 * Pour tester le chronomètre
 * @param id - Formation ID
 * @param minutes - Nombre de minutes dans le futur (default: 2)
 */
export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const { minutes = 2, timezone = "America/Port-au-Prince" } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Formation ID est requis" },
        { status: 400 }
      );
    }

    // Calculer la date future
    const scheduledTime = new Date();
    scheduledTime.setMinutes(scheduledTime.getMinutes() + parseInt(String(minutes)));
    const scheduledISO = scheduledTime.toISOString();

    console.log(`[Reset] Formation ${id} - Programmée pour ${scheduledISO} (${timezone})`);

    // Mettre à jour la formation
    const { error: updateError, data } = await supabaseAdmin
      .from("formations")
      .update({
        status: "scheduled",
        scheduled_publish_at: scheduledISO,
        scheduled_timezone: timezone,
        published_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select()
      .single();

    if (updateError) {
      console.error(`[Reset] Erreur:`, updateError);
      return NextResponse.json(
        { error: "Erreur lors de la mise à jour", details: updateError },
        { status: 500 }
      );
    }

    console.log(`[Reset] ✅ Formation réinitialisée`);

    return NextResponse.json(
      {
        message: "Formation réinitialisée avec succès",
        formation: {
          id: data.id,
          title: data.title,
          status: data.status,
          scheduled_publish_at: data.scheduled_publish_at,
          scheduled_timezone: data.scheduled_timezone,
          message: `Le chronomètre va compter ${minutes} minutes avant la publication`,
        },
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("[Reset] Erreur non gérée:", error);
    return NextResponse.json(
      { error: "Erreur serveur", details: error?.message },
      { status: 500 }
    );
  }
}
