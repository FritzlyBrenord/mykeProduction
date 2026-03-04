"use client";

import type { Database } from "@/types/supabase";
import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

let browserClient: SupabaseClient<Database, "public"> | undefined;

export function createClient(
  url?: string,
  anonKey?: string,
): SupabaseClient<Database, "public"> {
  if (browserClient) {
    return browserClient;
  }

  const finalUrl = url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const finalAnonKey = anonKey ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!finalUrl || !finalAnonKey) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }
  
  const client = createBrowserClient<Database, "public">(finalUrl, finalAnonKey, {
    cookieOptions: {
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    },
  });
  browserClient = client;
  return client;
}
