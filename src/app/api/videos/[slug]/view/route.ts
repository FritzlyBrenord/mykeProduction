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

    const { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id, access_type, price, view_count")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

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
        { error: "Vous ne pouvez pas visionner cette video." },
        { status: 403 },
      );
    }

    const now = new Date().toISOString();

    const { error: insertError } = await supabaseAdmin.from("video_views").insert({
      video_id: video.id,
      user_id: user?.id ?? null,
      device_id: deviceId,
      viewer_key: viewerKey,
      user_agent: userAgent || null,
      ip_hash: ip ? hashValue(ip) : null,
      first_viewed_at: now,
      last_viewed_at: now,
    });

    if (insertError?.code === "42P01") {
      const fallbackCount = Number(video.view_count || 0) + 1;
      await supabaseAdmin
        .from("videos")
        .update({ view_count: fallbackCount })
        .eq("id", video.id as string);

      return NextResponse.json({
        view_count: fallbackCount,
        unique_device: false,
        fallback: true,
      });
    }

    if (insertError?.code === "23505") {
      await supabaseAdmin
        .from("video_views")
        .update({
          user_id: user?.id ?? null,
          device_id: deviceId,
          user_agent: userAgent || null,
          ip_hash: ip ? hashValue(ip) : null,
          last_viewed_at: now,
          updated_at: now,
        })
        .eq("video_id", video.id as string)
        .eq("viewer_key", viewerKey);

      return NextResponse.json({
        view_count: Number(video.view_count || 0),
        unique_device: false,
      });
    }

    if (insertError) {
      throw insertError;
    }

    const { count: uniqueViewsCount, error: countError } = await supabaseAdmin
      .from("video_views")
      .select("id", { count: "exact", head: true })
      .eq("video_id", video.id as string);

    if (countError) {
      throw countError;
    }

    const nextViewCount = Number(uniqueViewsCount || 0);

    await supabaseAdmin
      .from("videos")
      .update({ view_count: nextViewCount })
      .eq("id", video.id as string);

    return NextResponse.json({
      view_count: nextViewCount,
      unique_device: true,
    });
  } catch (error) {
    console.error("Video view tracking error:", error);
    return NextResponse.json(
      { error: "Impossible d'enregistrer la vue." },
      { status: 500 },
    );
  }
}
