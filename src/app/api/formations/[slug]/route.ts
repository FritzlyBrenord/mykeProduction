import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

const FORMATION_PUBLIC_SELECT = `
  id,
  title,
  slug,
  description,
  content,
  thumbnail_url,
  price,
  is_free,
  format,
  status,
  category_id,
  author_id,
  duration_hours,
  level,
  language,
  certificate,
  enrolled_count,
  rating_avg,
  created_at,
  updated_at,
  category:categories(id,name,slug,type),
  author:profiles(id,full_name,avatar_url)
`;

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("formations")
      .select(FORMATION_PUBLIC_SELECT)
      .eq("slug", slug)
      .eq("status", "published")
      .is("deleted_at", null)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Formation introuvable." }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Public formation detail fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les details de la formation." },
      { status: 500 },
    );
  }
}
