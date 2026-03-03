import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type CommentStatus = "all" | "approved" | "pending" | "rejected";

function parsePositiveInt(raw: string | null, fallback: number, max: number) {
  if (!raw) return fallback;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function normalizeStatus(raw: string | null): CommentStatus {
  if (raw === "approved" || raw === "pending" || raw === "rejected") return raw;
  return "all";
}

async function countComments(videoId: string, status?: "approved" | "pending" | "rejected") {
  let query = supabaseAdmin
    .from("commentaires")
    .select("id", { count: "exact", head: true })
    .eq("video_id", videoId)
    .is("deleted_at", null);

  if (status) {
    query = query.eq("status", status);
  }

  return query;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parsePositiveInt(searchParams.get("page"), 1, 1000);
    const limit = parsePositiveInt(searchParams.get("limit"), 10, 50);
    const statusFilter = normalizeStatus(searchParams.get("status"));
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data: video, error: videoError } = await supabaseAdmin
      .from("videos")
      .select("id,title,slug,status,access_type,view_count,created_at")
      .eq("id", id)
      .is("deleted_at", null)
      .maybeSingle();

    if (videoError) {
      throw videoError;
    }

    if (!video) {
      return NextResponse.json({ error: "Video introuvable." }, { status: 404 });
    }

    let likesCount = 0;
    let likesFeatureAvailable = true;
    let likes: Array<{
      id: string;
      created_at: string;
      liker_key: string;
      user?: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    }> = [];

    const { count: likesFromTable, error: likesError } = await supabaseAdmin
      .from("video_likes")
      .select("id", { count: "exact", head: true })
      .eq("video_id", id);

    if (!likesError) {
      likesCount = Number(likesFromTable || 0);

      const { data: likeRows, error: likesListError } = await supabaseAdmin
        .from("video_likes")
        .select(
          `
            id,
            created_at,
            liker_key,
            user:profiles(id,full_name,avatar_url)
          `,
        )
        .eq("video_id", id)
        .order("created_at", { ascending: false })
        .limit(25);

      if (likesListError) {
        if (likesListError.code === "42P01" || likesListError.code === "42703") {
          likesFeatureAvailable = false;
          likes = [];
        } else {
          throw likesListError;
        }
      } else {
        likes = (likeRows || []) as typeof likes;
      }
    } else if (likesError.code === "42P01") {
      likesFeatureAvailable = false;
      const { data: fallbackLikes, error: fallbackLikesError } = await supabaseAdmin
        .from("videos")
        .select("likes")
        .eq("id", id)
        .maybeSingle();

      if (!fallbackLikesError) {
        likesCount = Number((fallbackLikes as { likes?: number | null } | null)?.likes || 0);
      }
    } else {
      throw likesError;
    }

    let commentsFeatureAvailable = true;
    let commentsTotal = 0;
    let commentsApproved = 0;
    let commentsPending = 0;
    let commentsRejected = 0;

    const totalResponse = await countComments(id);
    if (totalResponse.error) {
      if (totalResponse.error.code === "42703" || totalResponse.error.code === "42P01") {
        commentsFeatureAvailable = false;
      } else {
        throw totalResponse.error;
      }
    } else {
      commentsTotal = Number(totalResponse.count || 0);

      const [approvedResponse, pendingResponse, rejectedResponse] = await Promise.all([
        countComments(id, "approved"),
        countComments(id, "pending"),
        countComments(id, "rejected"),
      ]);

      if (approvedResponse.error || pendingResponse.error || rejectedResponse.error) {
        const firstError =
          approvedResponse.error || pendingResponse.error || rejectedResponse.error;
        if (firstError?.code === "42703" || firstError?.code === "42P01") {
          commentsFeatureAvailable = false;
          commentsTotal = 0;
        } else if (firstError) {
          throw firstError;
        }
      } else {
        commentsApproved = Number(approvedResponse.count || 0);
        commentsPending = Number(pendingResponse.count || 0);
        commentsRejected = Number(rejectedResponse.count || 0);
      }
    }

    let comments: Array<{
      id: string;
      content: string;
      status: "approved" | "pending" | "rejected";
      likes: number;
      created_at: string;
      parent_id: string | null;
      user?: {
        id: string;
        full_name: string | null;
        avatar_url: string | null;
      } | null;
    }> = [];
    let filteredTotal = 0;

    if (commentsFeatureAvailable) {
      let commentsQuery = supabaseAdmin
        .from("commentaires")
        .select(
          `
            id,
            content,
            status,
            likes,
            created_at,
            parent_id,
            user:profiles(id,full_name,avatar_url)
          `,
          { count: "exact" },
        )
        .eq("video_id", id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (statusFilter !== "all") {
        commentsQuery = commentsQuery.eq("status", statusFilter);
      }

      const { data: commentsRows, error: commentsError, count } = await commentsQuery;

      if (commentsError) {
        if (commentsError.code === "42703" || commentsError.code === "42P01") {
          commentsFeatureAvailable = false;
        } else {
          throw commentsError;
        }
      } else {
        comments = (commentsRows || []) as typeof comments;
        filteredTotal = Number(count || 0);
      }
    }

    const totalPages = Math.max(1, Math.ceil((filteredTotal || 0) / limit));

    return NextResponse.json({
      data: {
        video: {
          id: video.id,
          title: video.title,
          slug: video.slug,
          status: video.status,
          access_type: video.access_type,
          view_count: video.view_count,
          created_at: video.created_at,
        },
        stats: {
          likes: likesCount,
          comments: {
            total: commentsTotal,
            approved: commentsApproved,
            pending: commentsPending,
            rejected: commentsRejected,
          },
        },
        likes,
        likes_feature_available: likesFeatureAvailable,
        comments,
        comments_feature_available: commentsFeatureAvailable,
      },
      meta: {
        page,
        limit,
        status: statusFilter,
        total: filteredTotal,
        totalPages,
      },
    });
  } catch (error: unknown) {
    console.error("Admin video engagement fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch engagement";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
