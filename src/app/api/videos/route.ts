import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ACCESS = new Set(["public", "members", "paid"]);
const SELECT_WITH_SOCIAL = `
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
const SELECT_FALLBACK = `
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
const SELECT_LEGACY = `
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

function parseLimit(raw: string | null) {
  if (!raw) return 24;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return 24;
  return Math.min(value, 60);
}

function parsePage(raw: string | null) {
  if (!raw) return 1;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function normalizeSearch(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIds(raw: string | null) {
  if (!raw) return [];
  const uniqueIds = new Set<string>();

  for (const token of raw.split(",")) {
    const normalized = token.trim();
    if (!normalized) continue;
    if (normalized.length > 80) continue;
    uniqueIds.add(normalized);
    if (uniqueIds.size >= 200) break;
  }

  return Array.from(uniqueIds);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const ids = parseIds(searchParams.get("ids"));
    const queryPage = parsePage(searchParams.get("page"));
    const queryLimit = parseLimit(searchParams.get("limit"));
    const page = ids.length > 0 ? 1 : queryPage;
    const limit = ids.length > 0 ? Math.min(ids.length, 200) : queryLimit;
    const access = normalizeSearch(searchParams.get("access"));
    const search = normalizeSearch(searchParams.get("search"));
    const exclude = normalizeSearch(searchParams.get("exclude"));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const buildQuery = (selectClause: string, includeDescriptionSearch: boolean) => {
      let query = supabaseAdmin
        .from("videos")
        .select(selectClause, { count: "exact" })
        .eq("status", "published")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .range(from, to);

      if (ids.length > 0) {
        query = query.in("id", ids);
      }

      if (access && ALLOWED_ACCESS.has(access)) {
        query = query.eq("access_type", access);
      }

      if (exclude) {
        query = query.neq("slug", exclude);
      }

      if (search) {
        const safe = search.replace(/[,%]/g, " ").trim();
        if (safe.length > 0) {
          query = query.or(
            includeDescriptionSearch
              ? `title.ilike.%${safe}%,description.ilike.%${safe}%`
              : `title.ilike.%${safe}%`,
          );
        }
      }

      return query;
    };

    let { data, error, count } = await buildQuery(SELECT_WITH_SOCIAL, true);

    if (error) {
      const fallback = await buildQuery(SELECT_FALLBACK, false);
      data = fallback.data;
      error = fallback.error;
      count = fallback.count;
    }

    if (error) {
      const legacy = await buildQuery(SELECT_LEGACY, false);
      data = legacy.data;
      error = legacy.error;
      count = legacy.count;
    }

    if (error) throw error;

    const rows = (data ?? []) as Array<{
      id: string;
      likes: number | null;
      allow_comments: boolean | null;
    } & Record<string, unknown>>;

    const videoIds = rows.map((video) => video.id);
    const commentsByVideoId = new Map<string, number>();
    const likesByVideoId = new Map<string, number>();

    if (videoIds.length > 0) {
      const { data: commentsRows, error: commentsError } = await supabaseAdmin
        .from("commentaires")
        .select("video_id")
        .in("video_id", videoIds)
        .eq("status", "approved")
        .is("deleted_at", null);

      if (!commentsError || commentsError.code === "42703") {
        for (const row of (commentsRows ?? []) as Array<{ video_id: string | null }>) {
          if (!row.video_id) continue;
          commentsByVideoId.set(row.video_id, (commentsByVideoId.get(row.video_id) ?? 0) + 1);
        }
      }

      const { data: likesRows, error: likesError } = await supabaseAdmin
        .from("video_likes")
        .select("video_id")
        .in("video_id", videoIds);

      if (!likesError || likesError.code === "42P01") {
        for (const row of (likesRows ?? []) as Array<{ video_id: string | null }>) {
          if (!row.video_id) continue;
          likesByVideoId.set(row.video_id, (likesByVideoId.get(row.video_id) ?? 0) + 1);
        }
      }
    }

    const total = count ?? 0;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    return NextResponse.json({
      data: rows.map((video) => ({
        ...video,
        like_count: likesByVideoId.get(video.id) ?? Number(video.likes || 0),
        comment_count: commentsByVideoId.get(video.id) ?? 0,
        allow_comments: video.allow_comments ?? true,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Public videos fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les videos publiees." },
      { status: 500 },
    );
  }
}
