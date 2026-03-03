import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const access = await checkAdminAccess();
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.code },
        { status: access.status },
      );
    }

    const { id } = await params;
    const body = (await request.json()) as { role?: "admin" | "client" };
    const role = body.role === "admin" || body.role === "client" ? body.role : null;

    if (!id || !role) {
      return NextResponse.json(
        { error: "Identifiant ou role invalide." },
        { status: 400 },
      );
    }

    if (id === access.userId && role !== "admin") {
      return NextResponse.json(
        { error: "Vous ne pouvez pas retirer votre propre role admin." },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id,deleted_at")
      .eq("id", id)
      .maybeSingle();

    if (targetError) throw targetError;
    if (!target || target.deleted_at) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    const { error: profileError } = await supabaseAdmin
      .from("profiles")
      .update({ role, updated_at: nowIso })
      .eq("id", id)
      .is("deleted_at", null);
    if (profileError) throw profileError;

    const adminClient = createAdminClient();
    const { data: authData } = await adminClient.auth.admin.getUserById(id);
    const currentAppMetadata =
      (authData.user?.app_metadata as Record<string, unknown> | undefined) || {};

    const { error: authError } = await adminClient.auth.admin.updateUserById(id, {
      app_metadata: {
        ...currentAppMetadata,
        role,
      },
    });

    if (authError) {
      console.error("Admin user role auth metadata update error:", authError);
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: access.userId,
      action: "update_role",
      table_name: "profiles",
      record_id: id,
      new_data: { role },
    });

    return NextResponse.json({ success: true, id, role });
  } catch (error) {
    console.error("Admin utilisateur role update error:", error);
    const message =
      error instanceof Error ? error.message : "Failed to update user role";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
