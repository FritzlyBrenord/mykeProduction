import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

async function countPublished(table: "formations" | "articles" | "produits" | "videos") {
  const query = supabaseAdmin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("status", "published")
    .is("deleted_at", null);

  let { count, error } = await query;

  if (error && error.code === "42703") {
    const fallback = await supabaseAdmin
      .from(table)
      .select("id", { count: "exact", head: true })
      .eq("status", "published");
    count = fallback.count;
    error = fallback.error;
  }

  if (error) {
    throw error;
  }

  return Number(count || 0);
}

export async function GET() {
  try {
    const [formations, articles, produits, videos] = await Promise.all([
      countPublished("formations"),
      countPublished("articles"),
      countPublished("produits"),
      countPublished("videos"),
    ]);

    return NextResponse.json({
      data: {
        formations,
        articles,
        produits,
        videos,
      },
    });
  } catch (error) {
    console.error("Home stats fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les statistiques de la page d accueil." },
      { status: 500 },
    );
  }
}
