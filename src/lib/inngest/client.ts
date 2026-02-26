import { env } from "@/lib/env";
import { Inngest } from "inngest";

export const inngest = new Inngest({
  id: "myke-industrie",
  eventKey: env.INNGEST_EVENT_KEY,
});
