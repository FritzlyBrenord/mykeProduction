import { NextResponse } from "next/server";
import { checkAdminAccess } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseAdmin } from "@/lib/supabase-admin";

function normalizeEmail(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

export async function PATCH(request: Request) {
  try {
    const access = await checkAdminAccess();
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.code },
        { status: access.status },
      );
    }

    const body = (await request.json()) as { email?: unknown; password?: unknown };
    const nextEmail = body.email === undefined ? undefined : normalizeEmail(body.email);
    const nextPassword = typeof body.password === "string" ? body.password : undefined;

    if (body.email !== undefined && !nextEmail) {
      return NextResponse.json({ error: "Format email invalide." }, { status: 400 });
    }

    if (nextPassword !== undefined && nextPassword.length > 0 && nextPassword.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caracteres." },
        { status: 400 },
      );
    }

    const emailChanged =
      nextEmail !== undefined && nextEmail !== (access.email || "").trim().toLowerCase();
    const passwordChanged = typeof nextPassword === "string" && nextPassword.length > 0;

    if (!emailChanged && !passwordChanged) {
      return NextResponse.json({ error: "Aucune modification detectee." }, { status: 400 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: "Service unavailable" }, { status: 500 });
    }
    const updatePayload: { email?: string; password?: string; email_confirm?: boolean } = {};

    if (emailChanged && nextEmail) {
      updatePayload.email = nextEmail;
      updatePayload.email_confirm = true;
    }

    if (passwordChanged && nextPassword) {
      updatePayload.password = nextPassword;
    }

    const { data: updatedAuthUser, error: updateError } = await adminClient.auth.admin.updateUserById(
      access.userId,
      updatePayload,
    );

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || "Impossible de mettre a jour le compte admin." },
        { status: 400 },
      );
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: access.userId,
      action: "update_credentials",
      table_name: "auth.users",
      record_id: access.userId,
      new_data: {
        email_changed: emailChanged,
        password_changed: passwordChanged,
        email: updatedAuthUser.user?.email ?? access.email ?? null,
      },
    });

    return NextResponse.json({
      success: true,
      admin: {
        id: access.userId,
        email: updatedAuthUser.user?.email ?? access.email ?? null,
      },
      email_changed: emailChanged,
      password_changed: passwordChanged,
    });
  } catch (error) {
    console.error("Admin me update error:", error);
    const message =
      error instanceof Error ? error.message : "Impossible de mettre a jour le compte admin.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
