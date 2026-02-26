import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

/**
 * Fonction pour publier automatiquement les formations planifiées
 * Check toutes les formations avec un scheduled_publish_at <= maintenant
 * S'exécute toutes les 2 minutes pour plus de réactivité
 */
export const publishScheduledFormations = inngest.createFunction(
  { id: "publish-scheduled-formations" },
  { cron: "*/2 * * * *" }, // Toutes les 2 minutes (plus réactif)
  async ({ step }) => {
    const now = new Date();
    const nowISO = now.toISOString();

    console.log(`[Inngest] Vérification des formations à publier - ${nowISO}`);

    // Récupérer toutes les formations planifiées dont l'heure est arrivée
    const { data: scheduledFormations, error: fetchError } = await step.run(
      "fetch-scheduled-formations",
      async () => {
        const { data, error } = await supabaseAdmin
          .from("formations")
          .select("id, title, scheduled_publish_at, scheduled_timezone, status")
          .eq("status", "scheduled")
          .not("scheduled_publish_at", "is", null)
          .lte("scheduled_publish_at", nowISO)
          .order("scheduled_publish_at", { ascending: true });

        if (error) {
          console.error("[Inngest] Erreur lors de la récupération des formations:", error);
          throw error;
        }

        console.log(`[Inngest] Formations trouvées à publier: ${(data || []).length}`);
        return data || [];
      }
    );

    if (fetchError) {
      console.error("[Inngest] Erreur fetch:", fetchError);
      throw fetchError;
    }

    if (!scheduledFormations || scheduledFormations.length === 0) {
      console.log("[Inngest] Aucune formation à publier pour cette vérification");
      return { message: "No formations to publish", checked: true };
    }

    console.log(`[Inngest] Publication de ${scheduledFormations.length} formation(s)...`);

    // Publier chaque formation
    const publishResults = await Promise.all(
      scheduledFormations.map((formation: any) =>
        step.run(`publish-formation-${formation.id}`, async () => {
          const publishedAt = new Date().toISOString();
          
          console.log(`[Inngest] Publication de la formation: ${formation.id} (${formation.title})`);

          const { error: updateError } = await supabaseAdmin
            .from("formations")
            .update({
              status: "published",
              published_at: publishedAt,
              updated_at: publishedAt,
            })
            .eq("id", formation.id);

          if (updateError) {
            console.error(`[Inngest] Erreur lors de la publication de ${formation.id}:`, updateError);
            throw updateError;
          }

          // Log audit
          const { error: auditError } = await supabaseAdmin.from("audit_logs").insert({
            action: "update",
            table_name: "formations",
            record_id: formation.id,
            changes: {
              status: "draft → published",
              published_at: publishedAt,
            },
          });

          if (auditError) {
            console.warn(`[Inngest] Erreur audit log pour ${formation.id}:`, auditError);
          }

          console.log(`[Inngest] ✅ Formation publiée avec succès: ${formation.id}`);

          return {
            formationId: formation.id,
            title: formation.title,
            scheduledTime: formation.scheduled_publish_at,
            publishedAt,
          };
        })
      )
    );

    console.log(`[Inngest] Résultat: ${publishResults.length} formation(s) publiée(s)`);

    return {
      message: `Published ${publishResults.length} formations`,
      totalPublished: publishResults.length,
      published: publishResults,
    };
  }
);
