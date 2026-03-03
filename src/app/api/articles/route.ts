import { getCategoryLabel } from "@/lib/constants/articles";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

type ArticleRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string | null;
  content: string;
  thumbnail_url: string | null;
  status: "draft" | "published" | "scheduled" | "archived";
  category_id: string | null;
  author_id: string | null;
  published_at: string | null;
  seo_title: string | null;
  seo_description: string | null;
  og_image: string | null;
  view_count: number;
  reading_time: number | null;
  allow_comments: boolean;
  created_at: string;
  updated_at: string;
  author?: {
    id: string;
    full_name: string | null;
    avatar_url: string | null;
  } | null;
  article_categories?: Array<{ category_id: string | null }> | null;
};

function parseLimit(raw: string | null) {
  if (!raw) return 100;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return 100;
  return Math.min(parsed, 200);
}

function normalizeSearch(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function mapArticleWithCategory(article: ArticleRow, commentCount: number) {
  const categories = (article.article_categories ?? [])
    .map((entry) => entry.category_id)
    .filter((value): value is string => Boolean(value));

  const firstCategoryId = categories[0] ?? null;
  const category =
    firstCategoryId !== null
      ? {
          id: firstCategoryId,
          name: getCategoryLabel(firstCategoryId),
          slug: firstCategoryId,
          type: "article" as const,
        }
      : null;

  return {
    ...article,
    categories,
    comment_count: commentCount,
    category,
    article_categories: undefined,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const limit = parseLimit(searchParams.get("limit"));
    const search = normalizeSearch(searchParams.get("search"));
    const category = normalizeSearch(searchParams.get("category"));

    let query = supabaseAdmin
      .from("articles")
      .select(
        `
          id,
          title,
          slug,
          excerpt,
          content,
          thumbnail_url,
          status,
          category_id,
          author_id,
          published_at,
          seo_title,
          seo_description,
          og_image,
          view_count,
          reading_time,
          allow_comments,
          created_at,
          updated_at,
          author:profiles(id,full_name,avatar_url),
          article_categories(category_id)
        `,
      )
      .eq("status", "published")
      .is("deleted_at", null)
      .order("published_at", { ascending: false })
      .limit(limit);

    if (search) {
      const safe = search.replace(/,/g, " ");
      query = query.or(`title.ilike.%${safe}%,excerpt.ilike.%${safe}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const articles = (data ?? []) as unknown as ArticleRow[];
    const articleIds = articles.map((article) => article.id);

    const commentCountsByArticle = new Map<string, number>();
    if (articleIds.length > 0) {
      const { data: commentsRows, error: commentsError } = await supabaseAdmin
        .from("commentaires")
        .select("article_id")
        .in("article_id", articleIds)
        .eq("status", "approved")
        .is("deleted_at", null);

      if (commentsError) {
        throw commentsError;
      }

      for (const row of (commentsRows ?? []) as Array<{ article_id: string | null }>) {
        if (!row.article_id) continue;
        commentCountsByArticle.set(
          row.article_id,
          (commentCountsByArticle.get(row.article_id) ?? 0) + 1,
        );
      }
    }

    const transformed = articles
      .map((article) =>
        mapArticleWithCategory(article, commentCountsByArticle.get(article.id) ?? 0),
      )
      .filter((article) =>
        category ? article.categories.includes(category) : true,
      );

    return NextResponse.json(transformed);
  } catch (error) {
    console.error("Public articles fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les articles." },
      { status: 500 },
    );
  }
}
