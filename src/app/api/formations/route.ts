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

async function getEnrollmentCountByFormationIds(formationIds: string[]) {
  if (formationIds.length === 0) {
    return new Map<string, number>();
  }

  const { data, error } = await supabaseAdmin
    .from("enrollments")
    .select("formation_id,user_id")
    .in("formation_id", formationIds);

  if (error) throw error;

  const userIdsByFormation = new Map<string, Set<string>>();
  for (const row of (data ?? []) as Array<{ formation_id: string | null; user_id: string | null }>) {
    if (!row.formation_id || !row.user_id) continue;
    const users = userIdsByFormation.get(row.formation_id) ?? new Set<string>();
    users.add(row.user_id);
    userIdsByFormation.set(row.formation_id, users);
  }

  const counts = new Map<string, number>();
  for (const formationId of formationIds) {
    counts.set(formationId, userIdsByFormation.get(formationId)?.size ?? 0);
  }

  return counts;
}

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

function parseIds(value: string | null) {
  if (!value) return [];
  return value
    .split(",")
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
    .slice(0, 200);
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseLimit(searchParams.get("limit"));
    const exclude = normalizeSearch(searchParams.get("exclude"));
    const categoryId = normalizeSearch(searchParams.get("categoryId"));
    const search = normalizeSearch(searchParams.get("search"));
    const ids = parseIds(searchParams.get("ids"));

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

    if (ids.length > 0) {
      query = query.in("id", ids);
    }

    if (search) {
      const safe = search.replace(/,/g, " ");
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    const formations = data ?? [];
    const enrollmentCounts = await getEnrollmentCountByFormationIds(
      formations.map((formation) => formation.id),
    );

    return NextResponse.json(
      formations.map((formation) => ({
        ...formation,
        enrolled_count: enrollmentCounts.get(formation.id) ?? 0,
      })),
    );
  } catch (error) {
    console.error("Public formations fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les formations publiees." },
      { status: 500 },
    );
  }
}
