import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

type PublicCommentRow = {
  id: string;
  user_id: string;
  article_id: string | null;
  formation_id: string | null;
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
  } | null;
};

async function resolvePublishedArticleId(slug: string) {
  const { data, error } = await supabaseAdmin
    .from("articles")
    .select("id, allow_comments")
    .eq("slug", slug)
    .eq("status", "published")
    .is("deleted_at", null)
    .single();

  if (error || !data) {
    return null;
  }

  return data;
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
    const requestedLimit = parseInt(searchParams.get("limit") || "10", 10) || 10;
    const limit = Math.min(30, Math.max(1, requestedLimit));
    const offset = (page - 1) * limit;

    const article = await resolvePublishedArticleId(slug);
    if (!article) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    let rootQuery = supabaseAdmin
      .from("commentaires")
      .select(
        `
          id,
          user_id,
          article_id,
          formation_id,
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
      .eq("article_id", article.id)
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
            content,
            status,
            parent_id,
            likes,
            created_at,
            updated_at,
            user:profiles(id,full_name,avatar_url)
          `,
        )
        .eq("article_id", article.id)
        .is("deleted_at", null)
        .in("parent_id", rootIds)
        .order("created_at", { ascending: true });

      if (user?.id) {
        repliesQuery = repliesQuery.or(`status.eq.approved,user_id.eq.${user.id}`);
      } else {
        repliesQuery = repliesQuery.eq("status", "approved");
      }

      const { data: repliesData, error: repliesError } = await repliesQuery;
      if (repliesError) throw repliesError;
      replies = (repliesData ?? []) as PublicCommentRow[];
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
    console.error("Public comments fetch error:", error);
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

    const article = await resolvePublishedArticleId(slug);
    if (!article) {
      return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
    }

    if (!article.allow_comments) {
      return NextResponse.json(
        { error: "Les commentaires sont desactives pour cet article." },
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
        .select("id, article_id, user_id, status, deleted_at")
        .eq("id", parentId)
        .single();

      if (parentError || !parentComment || parentComment.deleted_at !== null) {
        return NextResponse.json({ error: "Commentaire parent introuvable." }, { status: 400 });
      }

      if (parentComment.article_id !== article.id) {
        return NextResponse.json(
          { error: "Le commentaire parent n'appartient pas a cet article." },
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

    const { data, error } = await supabase
      .from("commentaires")
      .insert({
        user_id: user.id,
        article_id: article.id,
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
    console.error("Public comment create error:", error);
    return NextResponse.json(
      { error: "Impossible d'envoyer le commentaire." },
      { status: 500 },
    );
  }
}
