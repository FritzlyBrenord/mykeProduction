import { inngest } from "@/lib/inngest/client";
import { createAdminClient } from "@/lib/supabase/admin";

const supabaseAdmin = createAdminClient();

type ScheduledFormation = {
  id: string;
  title: string | null;
  scheduled_publish_at: string | null;
  scheduled_timezone: string | null;
  status: string;
};

export const publishScheduledFormations = inngest.createFunction(
  { id: "publish-scheduled-formations" },
  { cron: "*/2 * * * *" },
  async ({ step }) => {
    const nowISO = new Date().toISOString();

    console.log(`[Inngest] Check scheduled formations - ${nowISO}`);

    const scheduledFormations = await step.run(
      "fetch-scheduled-formations",
      async (): Promise<ScheduledFormation[]> => {
        const { data, error } = await (supabaseAdmin
          .from("formations") as any)
          .select("id, title, scheduled_publish_at, scheduled_timezone, status")
          .eq("status", "scheduled")
          .not("scheduled_publish_at", "is", null)
          .lte("scheduled_publish_at", nowISO)
          .order("scheduled_publish_at", { ascending: true });

        if (error) {
          console.error("[Inngest] Failed to fetch scheduled formations:", error);
          throw error;
        }

        const rows = (data ?? []) as ScheduledFormation[];
        console.log(`[Inngest] Scheduled formations found: ${rows.length}`);
        return rows;
      },
    );

    if (scheduledFormations.length === 0) {
      console.log("[Inngest] Nothing to publish on this run");
      return { message: "No formations to publish", checked: true };
    }

    console.log(`[Inngest] Publishing ${scheduledFormations.length} formation(s)`);

    const publishResults = await Promise.all(
      scheduledFormations.map((formation) =>
        step.run(`publish-formation-${formation.id}`, async () => {
          const publishedAt = new Date().toISOString();

          console.log(`[Inngest] Publishing formation ${formation.id} (${formation.title ?? "Untitled"})`);

          const { error: updateError } = await (supabaseAdmin
            .from("formations") as any)
            .update({
              status: "published",
              published_at: publishedAt,
              updated_at: publishedAt,
            })
            .eq("id", formation.id);

          if (updateError) {
            console.error(`[Inngest] Failed publishing ${formation.id}:`, updateError);
            throw updateError;
          }

          const { error: auditError } = await (supabaseAdmin
            .from("audit_logs") as any)
            .insert({
              action: "update",
              table_name: "formations",
              record_id: formation.id,
              changes: {
                status: "draft -> published",
                published_at: publishedAt,
              },
            });

          if (auditError) {
            console.warn(`[Inngest] Audit log warning for ${formation.id}:`, auditError);
          }

          return {
            formationId: formation.id,
            title: formation.title,
            scheduledTime: formation.scheduled_publish_at,
            publishedAt,
          };
        }),
      ),
    );

    console.log(`[Inngest] Published ${publishResults.length} formation(s)`);

    return {
      message: `Published ${publishResults.length} formations`,
      totalPublished: publishResults.length,
      published: publishResults,
    };
  },
);
