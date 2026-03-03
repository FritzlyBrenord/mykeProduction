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

function withCategory(article: ArticleRow, commentCount: number) {
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

export async function GET(
  _: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;

    const { data, error } = await supabaseAdmin
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
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Article introuvable." }, { status: 404 });
      }
      throw error;
    }

    const article = data as unknown as ArticleRow;

    const { count: approvedCommentsCount, error: commentsError } = await supabaseAdmin
      .from("commentaires")
      .select("id", { count: "exact", head: true })
      .eq("article_id", article.id)
      .eq("status", "approved")
      .is("deleted_at", null);

    if (commentsError) {
      throw commentsError;
    }

    return NextResponse.json(withCategory(article, approvedCommentsCount ?? 0));
  } catch (error) {
    console.error("Public article detail fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer l'article." },
      { status: 500 },
    );
  }
}
