import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function normalizeNullableText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, maxLength);
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, role, is_active, deleted_at, phone_encrypted, country, bio, created_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: "Failed to load profile" }, { status: 500 });
  }

  return NextResponse.json({
    id: user.id,
    email: user.email ?? "",
    fullName: data?.full_name ?? user.user_metadata?.full_name ?? "",
    avatarUrl: data?.avatar_url ?? null,
    role: data?.role ?? "client",
    isActive: data?.is_active ?? true,
    deletedAt: data?.deleted_at ?? null,
    phone: data?.phone_encrypted ?? null,
    country: data?.country ?? null,
    bio: data?.bio ?? null,
    createdAt: data?.created_at ?? user.created_at ?? null,
  });
}

export async function PATCH(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const record = typeof body === "object" && body !== null ? body : {};
  const fullName = normalizeNullableText((record as Record<string, unknown>).fullName, 120);
  const phone = normalizeNullableText((record as Record<string, unknown>).phone, 30);
  const country = normalizeNullableText((record as Record<string, unknown>).country, 80);
  const bio = normalizeNullableText((record as Record<string, unknown>).bio, 800);

  if (!fullName) {
    return NextResponse.json(
      { error: "Le nom complet est obligatoire." },
      { status: 400 },
    );
  }

  const payload = {
    id: user.id,
    full_name: fullName,
    phone_encrypted: phone,
    country,
    bio,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from("profiles")
    .upsert(payload, { onConflict: "id" })
    .select("id, full_name, avatar_url, role, is_active, deleted_at, phone_encrypted, country, bio, created_at")
    .single();

  if (error) {
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 });
  }

  return NextResponse.json({
    id: data.id,
    email: user.email ?? "",
    fullName: data.full_name ?? "",
    avatarUrl: data.avatar_url ?? null,
    role: data.role ?? "client",
    isActive: data.is_active ?? true,
    deletedAt: data.deleted_at ?? null,
    phone: data.phone_encrypted ?? null,
    country: data.country ?? null,
    bio: data.bio ?? null,
    createdAt: data.created_at ?? null,
  });
}
