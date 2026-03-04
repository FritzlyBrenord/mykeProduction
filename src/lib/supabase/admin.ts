import { env, getPublicSupabaseEnv, getServiceRoleKey } from "@/lib/env";
import type { Database } from "@/types/supabase";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let adminClient: SupabaseClient<Database, "public"> | undefined;

export function createAdminClient(): SupabaseClient<Database, "public"> {
  if (adminClient) {
    return adminClient;
  }

  const baseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? getPublicSupabaseEnv().url;
  const serviceRoleKey = getServiceRoleKey();

  adminClient = createClient<Database, "public">(baseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  return adminClient;
}
