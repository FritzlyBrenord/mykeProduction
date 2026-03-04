import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { resolveVideoAccess } from "@/lib/videos/access";
import { NextRequest, NextResponse } from "next/server";

type PublicCommentRow = {
  id: string;
  user_id: string;
  article_id: string | null;
  formation_id: string | null;
  video_id: string | null;
  content: string;
  status: "approved" | "pending" | "rejected";
  parent_id: string | null;
  likes: number;
  created_at: string;
  updated_at: string;
  user?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  }[] | null;
};

type VideoAccessRow = {
  id: string;
  access_type: "public" | "members" | "paid";
  price: number;
  allow_comments: boolean | null;
};

async function resolvePublishedVideo(slug: string) {
  let { data, error } = await supabaseAdmin
    .from("videos")
    .select("id, access_type, price, allow_comments")
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
    data = fallback.data
      ? ({ ...fallback.data, allow_comments: null } as VideoAccessRow)
      : null;
    error = fallback.error;
  }

  if (error || !data) {
    return null;
  }

  return data as VideoAccessRow;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10) || 1);
    const requestedLimit = parseInt(searchParams.get("limit") || "12", 10) || 12;
    const limit = Math.min(40, Math.max(1, requestedLimit));
    const offset = (page - 1) * limit;

    const video = await resolvePublishedVideo(slug);
    if (!video) {
      return NextResponse.json({ error: "Video introuvable." }, { status: 404 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const access = await resolveVideoAccess({
      accessType: video.access_type,
      price: Number(video.price || 0),
      userId: user?.id ?? null,
      videoId: video.id,
    });

    if (!access.canWatch) {
      return NextResponse.json(
        { error: "Vous devez debloquer cette video pour voir les commentaires." },
        { status: 403 },
      );
    }

    let rootQuery = supabaseAdmin
      .from("commentaires")
      .select(
        `
          id,
          user_id,
          article_id,
          formation_id,
          video_id,
          content,
          status,
          parent_id,
          likes,
          created_at,
          updated_at,
          user:profiles(id,full_name,avatar_url)
        `,
        { count: "exact" },
      )
      .eq("video_id", video.id)
      .is("deleted_at", null)
      .is("parent_id", null);

    if (user?.id) {
      rootQuery = rootQuery.or(`status.eq.approved,user_id.eq.${user.id}`);
    } else {
      rootQuery = rootQuery.eq("status", "approved");
    }

    const { data: rootComments, error, count } = await rootQuery
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      if (error.code === "42703" || error.code === "42P01") {
        return NextResponse.json({
          data: [],
          meta: {
            total: 0,
            page,
            limit,
            totalPages: 1,
          },
          migration_required: true,
        });
      }
      throw error;
    }

    const rootIds = (rootComments ?? []).map((comment) => comment.id);
    let replies: PublicCommentRow[] = [];

    if (rootIds.length > 0) {
      let repliesQuery = supabaseAdmin
        .from("commentaires")
        .select(
          `
            id,
            user_id,
            article_id,
            formation_id,
            video_id,
            content,
            status,
            parent_id,
            likes,
            created_at,
            updated_at,
            user:profiles(id,full_name,avatar_url)
          `,
        )
        .eq("video_id", video.id)
        .is("deleted_at", null)
        .in("parent_id", rootIds)
        .order("created_at", { ascending: true });

      if (user?.id) {
        repliesQuery = repliesQuery.or(`status.eq.approved,user_id.eq.${user.id}`);
      } else {
        repliesQuery = repliesQuery.eq("status", "approved");
      }

      const { data: repliesData, error: repliesError } = await repliesQuery;
      if (repliesError) {
        if (repliesError.code !== "42703" && repliesError.code !== "42P01") {
          throw repliesError;
        }
      } else {
        replies = (repliesData ?? []) as PublicCommentRow[];
      }
    }

    return NextResponse.json({
      data: [...((rootComments ?? []) as PublicCommentRow[]), ...replies],
      meta: {
        total: count || 0,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil((count || 0) / limit)),
      },
    });
  } catch (error) {
    console.error("Public video comments fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les commentaires." },
      { status: 500 },
    );
  }
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
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Non authentifie." }, { status: 401 });
    }

    const video = await resolvePublishedVideo(slug);
    if (!video) {
      return NextResponse.json({ error: "Video introuvable." }, { status: 404 });
    }

    const access = await resolveVideoAccess({
      accessType: video.access_type,
      price: Number(video.price || 0),
      userId: user.id,
      videoId: video.id,
    });

    if (!access.canWatch) {
      return NextResponse.json(
        { error: "Vous devez debloquer cette video pour commenter." },
        { status: 403 },
      );
    }

    if ((video.allow_comments ?? true) === false) {
      return NextResponse.json(
        { error: "Les commentaires sont desactives pour cette video." },
        { status: 403 },
      );
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 });
    }

    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const content = typeof payload.content === "string" ? payload.content.trim() : "";
    const parentId = typeof payload.parent_id === "string" ? payload.parent_id : null;

    if (!content) {
      return NextResponse.json({ error: "Le commentaire est requis." }, { status: 400 });
    }

    if (content.length > 3000) {
      return NextResponse.json({ error: "Commentaire trop long." }, { status: 400 });
    }

    if (parentId) {
      const { data: parentComment, error: parentError } = await supabaseAdmin
        .from("commentaires")
        .select("id, video_id, user_id, status, deleted_at")
        .eq("id", parentId)
        .single();

      if (parentError?.code === "42703") {
        return NextResponse.json(
          { error: "Migration SQL video commentaires manquante." },
          { status: 503 },
        );
      }

      if (parentError || !parentComment || parentComment.deleted_at !== null) {
        return NextResponse.json({ error: "Commentaire parent introuvable." }, { status: 400 });
      }

      if (parentComment.video_id !== video.id) {
        return NextResponse.json(
          { error: "Le commentaire parent n'appartient pas a cette video." },
          { status: 400 },
        );
      }

      const canReplyToParent =
        parentComment.status === "approved" || parentComment.user_id === user.id;

      if (!canReplyToParent) {
        return NextResponse.json(
          { error: "Vous ne pouvez pas repondre a ce commentaire." },
          { status: 403 },
        );
      }
    }

    const { data, error } = await (supabase
      .from("commentaires") as any)
      .insert({
        user_id: user.id,
        video_id: video.id,
        parent_id: parentId,
        content,
        status: "pending",
      })
      .select(
        `
          id,
          user_id,
          article_id,
          formation_id,
          video_id,
          content,
          status,
          parent_id,
          likes,
          created_at,
          updated_at,
          user:profiles(id,full_name,avatar_url)
        `,
      )
      .single();

    if (error) {
      if (error.code === "42703") {
        return NextResponse.json(
          { error: "Migration SQL video commentaires manquante." },
          { status: 503 },
        );
      }
      throw error;
    }

    return NextResponse.json(
      {
        data,
        message: "Commentaire envoye. Il sera visible apres validation.",
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Public video comment create error:", error);
    return NextResponse.json(
      { error: "Impossible d'envoyer le commentaire." },
      { status: 500 },
    );
  }
}
