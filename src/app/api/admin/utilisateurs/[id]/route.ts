import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkAdminAccess } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

function normalizeFullName(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

export async function DELETE(
  _request: Request,
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

    if (!id) {
      return NextResponse.json({ error: "Identifiant utilisateur manquant." }, { status: 400 });
    }

    if (id === access.userId) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id,role,deleted_at")
      .eq("id", id)
      .maybeSingle();

    if (targetError) throw targetError;

    if (!target || target.deleted_at) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (target.role === "admin") {
      return NextResponse.json(
        { error: "Suppression des comptes administrateur non autorisee." },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: updateError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_active: false,
        deleted_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", id)
      .is("deleted_at", null);

    if (updateError) throw updateError;

    await supabaseAdmin.from("audit_logs").insert({
      user_id: access.userId,
      action: "delete",
      table_name: "profiles",
      record_id: id,
      new_data: { id, mode: "single_soft_delete" },
    });

    return NextResponse.json({ success: true, deleted_id: id });
  } catch (error) {
    console.error("Admin utilisateur delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
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
    if (!id) {
      return NextResponse.json(
        { error: "Identifiant utilisateur manquant." },
        { status: 400 },
      );
    }

    const body = (await request.json()) as {
      role?: "admin" | "client";
      is_active?: boolean;
      full_name?: string | null;
    };

    const role = body.role === "admin" || body.role === "client" ? body.role : undefined;
    const isActive =
      typeof body.is_active === "boolean" ? body.is_active : undefined;
    const fullName =
      body.full_name === undefined ? undefined : normalizeFullName(body.full_name);

    if (
      role === undefined &&
      isActive === undefined &&
      fullName === undefined
    ) {
      return NextResponse.json(
        { error: "Aucune modification fournie." },
        { status: 400 },
      );
    }

    const { data: target, error: targetError } = await supabaseAdmin
      .from("profiles")
      .select("id,role,is_active,deleted_at,full_name")
      .eq("id", id)
      .maybeSingle();

    if (targetError) throw targetError;

    if (!target || target.deleted_at) {
      return NextResponse.json({ error: "Utilisateur introuvable." }, { status: 404 });
    }

    if (id === access.userId) {
      if (role === "client") {
        return NextResponse.json(
          { error: "Vous ne pouvez pas retirer votre propre role admin." },
          { status: 400 },
        );
      }
      if (isActive === false) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas bloquer votre propre compte." },
          { status: 400 },
        );
      }
    }

    const nowIso = new Date().toISOString();
    const updatePayload: {
      role?: "admin" | "client";
      is_active?: boolean;
      full_name?: string | null;
      updated_at: string;
    } = { updated_at: nowIso };

    if (role !== undefined) updatePayload.role = role;
    if (isActive !== undefined) updatePayload.is_active = isActive;
    if (fullName !== undefined) updatePayload.full_name = fullName;

    const { data: updatedProfile, error: updateError } = await supabaseAdmin
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .is("deleted_at", null)
      .select("id,role,is_active,full_name,updated_at")
      .single();

    if (updateError) throw updateError;

    if (role !== undefined || fullName !== undefined) {
      const adminClient = createAdminClient();
      const { data: authData } = await adminClient.auth.admin.getUserById(id);
      const currentAppMetadata =
        (authData.user?.app_metadata as Record<string, unknown> | undefined) ||
        {};
      const currentUserMetadata =
        (authData.user?.user_metadata as Record<string, unknown> | undefined) ||
        {};

      const authUpdatePayload: {
        app_metadata?: Record<string, unknown>;
        user_metadata?: Record<string, unknown>;
      } = {};

      if (role !== undefined) {
        authUpdatePayload.app_metadata = {
          ...currentAppMetadata,
          role,
        };
      }

      if (fullName !== undefined) {
        authUpdatePayload.user_metadata = {
          ...currentUserMetadata,
          full_name: fullName,
        };
      }

      const { error: authUpdateError } = await adminClient.auth.admin.updateUserById(
        id,
        authUpdatePayload,
      );
      if (authUpdateError) {
        console.error("Admin user auth metadata update error:", authUpdateError);
      }
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: access.userId,
      action: "update",
      table_name: "profiles",
      record_id: id,
      new_data: {
        changes: {
          role: role ?? null,
          is_active: isActive ?? null,
          full_name: fullName ?? null,
        },
      },
    });

    return NextResponse.json({
      success: true,
      user: updatedProfile,
    });
  } catch (error) {
    console.error("Admin utilisateur patch error:", error);
    const message = error instanceof Error ? error.message : "Failed to update user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
