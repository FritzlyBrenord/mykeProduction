import { env, getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/database.types";
import { createClient } from "@supabase/supabase-js";

let adminClient: ReturnType<typeof createClient<Database>> | undefined;

export function createAdminClient() {
  if (adminClient) {
    return adminClient;
  }

  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? getPublicSupabaseEnv().url;
  const serviceRoleKey = getServiceRoleKey();

  adminClient = createClient<Database>(baseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
