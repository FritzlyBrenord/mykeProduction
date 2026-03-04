import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/supabase";
import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

export async function createClient(): Promise<SupabaseClient<Database, "public">> {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient<Database, "public">(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(
        cookiesToSet: Array<{ name: string; value: string; options?: Record<string, unknown> }>,
      ) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies.
        }
      },
    },
  });
}
