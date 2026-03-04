import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveVideoAccess } from "@/lib/videos/access";
import { NextResponse } from "next/server";

type VideoRow = {
  id: string;
  title: string;
  slug: string;
  video_url: string | null;
  video_type: "upload" | "youtube" | "vimeo";
  access_type: "public" | "members" | "paid";
  price: number;
  status: "published" | "draft" | "archived";
  category_id: string | null;
  playlist_id: string | null;
  view_count: number;
  thumbnail_url: string | null;
  description?: string | null;
  allow_comments?: boolean | null;
  likes?: number | null;
  created_at: string;
};

const DETAIL_SELECT_WITH_SOCIAL = `
  id,
  title,
  slug,
  video_url,
  video_type,
  access_type,
  price,
  status,
  category_id,
  playlist_id,
  view_count,
  thumbnail_url,
  description,
  allow_comments,
  likes,
  created_at
`;

const DETAIL_SELECT_FALLBACK = `
  id,
  title,
  slug,
  video_url,
  video_type,
  access_type,
  price,
  status,
  category_id,
  playlist_id,
  view_count,
  thumbnail_url,
  created_at
`;

const DETAIL_SELECT_LEGACY = `
  id,
  title,
  slug,
  video_url,
  video_type,
  access_type,
  price,
  status,
  category_id,
  playlist_id,
  view_count,
  created_at
`;

async function fetchPublishedVideoBySlug(slug: string) {
  let { data, error } = await supabaseAdmin
    .from("videos")
    .select(DETAIL_SELECT_WITH_SOCIAL)
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (error) {
    const fallback = await supabaseAdmin
      .from("videos")
      .select(DETAIL_SELECT_FALLBACK)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();
    data = (fallback.data ?? null) as typeof data;
    error = fallback.error;
  }

  if (error) {
    const legacy = await supabaseAdmin
      .from("videos")
      .select(DETAIL_SELECT_LEGACY)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();
    data = (legacy.data ?? null) as typeof data;
    error = legacy.error;
  }

  return { data: data as VideoRow | null, error };
}

async function fetchRelatedVideos(video: VideoRow, limit = 6) {
  let query = supabaseAdmin
    .from("videos")
    .select(DETAIL_SELECT_WITH_SOCIAL)
    .eq("status", "published")
    .is("deleted_at", null)
    .neq("slug", video.slug)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (video.category_id) {
    query = query.eq("category_id", video.category_id);
  }

  let { data, error } = await query;

  if (error) {
    let fallbackQuery = supabaseAdmin
      .from("videos")
      .select(DETAIL_SELECT_FALLBACK)
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("slug", video.slug)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (video.category_id) {
      fallbackQuery = fallbackQuery.eq("category_id", video.category_id);
    }

    const fallback = await fallbackQuery;
    data = (fallback.data ?? null) as typeof data;
    error = fallback.error;
  }

  if (error) {
    let legacyQuery = supabaseAdmin
      .from("videos")
      .select(DETAIL_SELECT_LEGACY)
      .eq("status", "published")
      .is("deleted_at", null)
      .neq("slug", video.slug)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (video.category_id) {
      legacyQuery = legacyQuery.eq("category_id", video.category_id);
    }

    const legacy = await legacyQuery;
    data = (legacy.data ?? null) as typeof data;
    error = legacy.error;
  }

  if (error) {
    throw error;
  }

  return (data ?? []) as VideoRow[];
}

export async function GET(
  _: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    const { data: video, error: videoError } = await fetchPublishedVideoBySlug(slug);

    if (videoError?.code === "PGRST116" || !video) {
      return NextResponse.json({ error: "Video introuvable." }, { status: 404 });
    }

    if (videoError) {
      throw videoError;
    }

    const access = await resolveVideoAccess({
      accessType: video.access_type,
      price: Number(video.price || 0),
      userId: user?.id ?? null,
      videoId: video.id,
    });

    const storedLikes = Number(video.likes || 0);
    let likeCount = storedLikes;

    const { count: likesCount, error: likesError } = await supabaseAdmin
      .from("video_likes")
      .select("id", { count: "exact", head: true })
      .eq("video_id", video.id);

    if (!likesError) {
      likeCount = Number(likesCount || 0);
    } else if (likesError.code !== "42P01") {
      throw likesError;
    }

    let commentCount = 0;
    const { count: commentsCount, error: commentsError } = await supabaseAdmin
      .from("commentaires")
      .select("id", { count: "exact", head: true })
      .eq("video_id", video.id)
      .eq("status", "approved")
      .is("deleted_at", null);

    if (!commentsError) {
      commentCount = Number(commentsCount || 0);
    } else if (commentsError.code !== "42703") {
      throw commentsError;
    }

    const related = await fetchRelatedVideos(video);

    return NextResponse.json({
      data: {
        ...video,
        video_url: access.canWatch ? video.video_url : null,
        like_count: likeCount,
        comment_count: commentCount,
        allow_comments: video.allow_comments ?? true,
        can_watch: access.canWatch,
        requires_auth: access.requiresAuth,
        requires_purchase: access.requiresPurchase,
        purchased: access.purchased,
      },
      related: related.map((item) => ({
        ...item,
        allow_comments: item.allow_comments ?? true,
        like_count: Number(item.likes || 0),
      })),
    });
  } catch (error) {
    console.error("Public video detail fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer la video." },
      { status: 500 },
    );
  }
}
