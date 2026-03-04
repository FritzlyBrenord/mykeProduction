import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveVideoAccess } from "@/lib/videos/access";
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

async function fetchVideoWithFallback(slug: string) {
  let { data, error } = await supabaseAdmin
    .from("videos")
    .select("id, access_type, price, likes")
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (error?.code === "42703") {
    const fallback = await supabaseAdmin
      .from("videos")
      .select("id, access_type, price")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();
    data = fallback.data ? ({ ...fallback.data, likes: null } as typeof data) : null;
    error = fallback.error;
  }

  return { data, error };
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
    const likerSeed = user?.id ? `user:${user.id}` : `device:${deviceId}:${userAgent}:${ip}`;
    const likerKey = hashValue(likerSeed);

    const { data: video, error: videoError } = await fetchVideoWithFallback(slug);

    if (videoError || !video) {
      return NextResponse.json({ error: "Video introuvable." }, { status: 404 });
    }

    const access = await resolveVideoAccess({
      accessType: video.access_type as "public" | "members" | "paid",
      price: Number(video.price || 0),
      userId: user?.id ?? null,
      videoId: video.id as string,
    });

    if (!access.canWatch) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas aimer cette video." },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();
    const currentLikes = Number((video as { likes?: number | null }).likes || 0);

    const { error: likeInsertError } = await supabaseAdmin.from("video_likes").insert({
      video_id: video.id,
      user_id: user?.id ?? null,
      device_id: deviceId,
      liker_key: likerKey,
      user_agent: userAgent || null,
      ip_hash: ip ? hashValue(ip) : null,
      created_at: now,
      updated_at: now,
    });

    if (likeInsertError?.code === "42P01") {
      const fallbackLikes = currentLikes + 1;
      const { error: updateError } = await supabaseAdmin
        .from("videos")
        .update({ likes: fallbackLikes })
        .eq("id", video.id as string);

      if (updateError && updateError.code !== "42703") {
        throw updateError;
      }

      return NextResponse.json({
        likes: fallbackLikes,
        liked: true,
        already_liked: false,
        fallback: true,
      });
    }

    if (likeInsertError?.code === "23505") {
      return NextResponse.json({
        likes: currentLikes,
        liked: false,
        already_liked: true,
      });
    }

    if (likeInsertError) {
      throw likeInsertError;
    }

    const { count: likesCount, error: likesCountError } = await supabaseAdmin
      .from("video_likes")
      .select("id", { count: "exact", head: true })
      .eq("video_id", video.id as string);

    if (likesCountError) {
      throw likesCountError;
    }

    const nextLikes = Number(likesCount || 0);
    const { error: likesSyncError } = await supabaseAdmin
      .from("videos")
      .update({ likes: nextLikes })
      .eq("id", video.id as string);

    if (likesSyncError && likesSyncError.code !== "42703") {
      throw likesSyncError;
    }

    return NextResponse.json({
      likes: nextLikes,
      liked: true,
      already_liked: false,
    });
  } catch (error) {
    console.error("Video like error:", error);
    return NextResponse.json(
      { error: "Impossible d'aimer cette video." },
      { status: 500 },
    );
  }
}
