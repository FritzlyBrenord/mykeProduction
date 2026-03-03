import "server-only";

import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type AccessFailureCode = "UNAUTHENTICATED" | "FORBIDDEN" | "BLOCKED";

type AdminProfileRow = {
  id: string;
  full_name: string | null;
  role: "admin" | "client" | null;
  is_active: boolean | null;
  deleted_at: string | null;
};

export type AdminAccessResult =
  | {
      ok: true;
      userId: string;
      email: string | null;
      profile: AdminProfileRow;
    }
  | {
      ok: false;
      status: 401 | 403;
      code: AccessFailureCode;
      message: string;
    };

function isBlockedProfile(profile: AdminProfileRow | null) {
  if (!profile) return false;
  return profile.is_active === false || Boolean(profile.deleted_at);
}

export async function checkAdminAccess(): Promise<AdminAccessResult> {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      ok: false,
      status: 401,
      code: "UNAUTHENTICATED",
      message: "Vous devez etre connecte.",
    };
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from("profiles")
    .select("id,full_name,role,is_active,deleted_at")
    .eq("id", user.id)
    .maybeSingle<AdminProfileRow>();

  if (profileError) {
    console.error("Admin access profile lookup error:", profileError);
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Acces admin refuse.",
    };
  }

  if (isBlockedProfile(profile ?? null)) {
    return {
      ok: false,
      status: 403,
      code: "BLOCKED",
      message: "Compte desactive. Contactez un administrateur.",
    };
  }

  const roleFromMetadata =
    (user.app_metadata?.role as "admin" | "client" | undefined) ??
    (user.user_metadata?.role as "admin" | "client" | undefined);
  const isAdmin = profile?.role === "admin" || roleFromMetadata === "admin";

  if (!isAdmin) {
    return {
      ok: false,
      status: 403,
      code: "FORBIDDEN",
      message: "Acces admin refuse.",
    };
  }

  return {
    ok: true,
    userId: user.id,
    email: user.email ?? null,
    profile: profile ?? {
      id: user.id,
      full_name: null,
      role: "admin",
      is_active: true,
      deleted_at: null,
    },
  };
}
