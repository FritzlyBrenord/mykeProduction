import { inngest } from "@/lib/inngest/client";
import { publishScheduledFormations } from "./publish-scheduled";

export const pingEvent = inngest.createFunction(
  { id: "app-health-check" },
  { event: "app/healthcheck.requested" },
  async () => {
    return { ok: true };
  },
);

export const inngestFunctions = [pingEvent, publishScheduledFormations];
