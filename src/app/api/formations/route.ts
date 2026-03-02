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

function parseLimit(raw: string | null) {
  if (!raw) return 100;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return 100;
  return Math.min(value, 200);
}

function normalizeSearch(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const exclude = normalizeSearch(searchParams.get("exclude"));
    const categoryId = normalizeSearch(searchParams.get("categoryId"));
    const search = normalizeSearch(searchParams.get("search"));

    let query = supabaseAdmin
      .from("formations")
      .select(FORMATION_PUBLIC_SELECT)
      .eq("status", "published")
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (exclude) {
      query = query.neq("slug", exclude);
    }

    if (categoryId) {
      query = query.eq("category_id", categoryId);
    }

    if (search) {
      const safe = search.replace(/,/g, " ");
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return NextResponse.json(data ?? []);
  } catch (error) {
    console.error("Public formations fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les formations publiees." },
      { status: 500 },
    );
  }
}
