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
  { params }: { params: Promise<{ slug: string; commentId: string }> },
) {
  try {
    const { slug, commentId } = await params;
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

    const { data: article, error: articleError } = await supabaseAdmin
      .from("articles")
      .select("id")
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (articleError || !article) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const { data: commentaire, error: commentaireError } = await supabaseAdmin
      .from("commentaires")
      .select("id, article_id, user_id, likes, status, deleted_at")
      .eq("id", commentId)
      .single();

    if (commentaireError || !commentaire || commentaire.deleted_at !== null) {
      return NextResponse.json({ error: "Commentaire introuvable." }, { status: 404 });
    }

    if (commentaire.article_id !== article.id) {
      return NextResponse.json({ error: "Commentaire invalide pour cet article." }, { status: 400 });
    }

    const canLikeComment =
      commentaire.status === "approved" || (Boolean(user?.id) && commentaire.user_id === user?.id);

    if (!canLikeComment) {
      return NextResponse.json({ error: "Ce commentaire ne peut pas etre aime." }, { status: 403 });
    }

    const now = new Date().toISOString();

    const { error: likeInsertError } = await supabaseAdmin.from("commentaire_likes").insert({
      commentaire_id: commentaire.id,
      article_id: article.id,
      user_id: user?.id ?? null,
      device_id: deviceId,
      liker_key: likerKey,
      user_agent: userAgent || null,
      ip_hash: ip ? hashValue(ip) : null,
      created_at: now,
      updated_at: now,
    });

    // If table is missing, fallback to naive increment.
    if (likeInsertError?.code === "42P01") {
      const fallbackLikes = Number(commentaire.likes || 0) + 1;
      await supabaseAdmin
        .from("commentaires")
        .update({ likes: fallbackLikes, updated_at: now })
        .eq("id", commentaire.id);

      return NextResponse.json({
        likes: fallbackLikes,
        liked: true,
        already_liked: false,
        fallback: true,
      });
    }

    if (likeInsertError?.code === "23505") {
      return NextResponse.json({
        likes: Number(commentaire.likes || 0),
        liked: false,
        already_liked: true,
      });
    }

    if (likeInsertError) {
      throw likeInsertError;
    }

    const { count: likesCount, error: likesCountError } = await supabaseAdmin
      .from("commentaire_likes")
      .select("id", { count: "exact", head: true })
      .eq("commentaire_id", commentaire.id);

    if (likesCountError) {
      throw likesCountError;
    }

    const nextLikes = Number(likesCount || 0);

    await supabaseAdmin
      .from("commentaires")
      .update({ likes: nextLikes, updated_at: now })
      .eq("id", commentaire.id);

    return NextResponse.json({
      likes: nextLikes,
      liked: true,
      already_liked: false,
    });
  } catch (error) {
    console.error("Comment like error:", error);
    return NextResponse.json(
      { error: "Impossible d'aimer ce commentaire." },
      { status: 500 },
    );
  }
}
