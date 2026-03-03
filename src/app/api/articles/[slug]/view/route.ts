import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeDeviceId(raw: unknown) {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  if (normalized.length > 200) return null;
  return normalized;
}

function extractClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim();
  return first || null;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const deviceIdFromBody = normalizeDeviceId(payload.device_id);
    const deviceIdFromHeader = normalizeDeviceId(request.headers.get("x-device-id"));
    const deviceId = deviceIdFromBody ?? deviceIdFromHeader ?? randomUUID();

    const userAgent = request.headers.get("user-agent") || "";
    const ip = extractClientIp(request) || "";
    const viewerSeed = user?.id ? `user:${user.id}` : `device:${deviceId}:${userAgent}:${ip}`;
    const viewerKey = hashValue(viewerSeed);

    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("id, view_count")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const now = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin.from("article_views").insert({
      article_id: article.id,
      user_id: user?.id ?? null,
      device_id: deviceId,
      viewer_key: viewerKey,
      user_agent: userAgent || null,
      ip_hash: ip ? hashValue(ip) : null,
      first_viewed_at: now,
      last_viewed_at: now,
    });

    // If table is missing, keep backward compatibility with a simple increment.
    if (insertError?.code === "42P01") {
      const fallbackViewCount = Number(article.view_count || 0) + 1;
      await supabaseAdmin
        .from("articles")
        .update({ view_count: fallbackViewCount, updated_at: now })
        .eq("id", article.id);

      return NextResponse.json({
        view_count: fallbackViewCount,
        unique_device: false,
        fallback: true,
      });
    }

    // Duplicate unique key => same device/user already counted, only refresh metadata.
    if (insertError?.code === "23505") {
      await supabaseAdmin
        .from("article_views")
        .update({
          user_id: user?.id ?? null,
          device_id: deviceId,
          user_agent: userAgent || null,
          ip_hash: ip ? hashValue(ip) : null,
          last_viewed_at: now,
          updated_at: now,
        })
        .eq("article_id", article.id)
        .eq("viewer_key", viewerKey);

      return NextResponse.json({
        view_count: Number(article.view_count || 0),
        unique_device: false,
      });
    }

    if (insertError) {
      throw insertError;
    }

    const { count: uniqueViewsCount, error: countError } = await supabaseAdmin
      .from("article_views")
      .select("id", { count: "exact", head: true })
      .eq("article_id", article.id);

    if (countError) {
      throw countError;
    }

    const nextViewCount = Number(uniqueViewsCount || 0);

    await supabaseAdmin
      .from("articles")
      .update({ view_count: nextViewCount, updated_at: now })
      .eq("id", article.id);

    return NextResponse.json({
      view_count: nextViewCount,
      unique_device: true,
    });
  } catch (error) {
    console.error("Article view tracking error:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la vue." },
      { status: 500 },
    );
  }
}
