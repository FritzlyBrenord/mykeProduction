import { supabaseAdmin } from "@/lib/supabase-admin";
import { normalizeProductRecord } from "@/lib/products";
import { NextRequest, NextResponse } from "next/server";

const PRODUCT_PUBLIC_SELECT = `
  id,
  name,
  slug,
  description,
  content,
  price,
  images,
  type,
  stock,
  is_digital,
  file_url,
  cas_number,
  msds_url,
  purity,
  unit,
  min_order,
  ghs_pictograms,
  hazard_statements,
  precautionary_statements,
  signal_word,
  age_restricted,
  restricted_sale,
  adr_class,
  status,
  category_id,
  featured,
  created_at,
  updated_at,
  category:categories(id,name,slug,type)
`;

const ALLOWED_TYPES = new Set(["chimique", "document", "autre"]);

function parseLimit(raw: string | null) {
  if (!raw) return 24;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return 24;
  return Math.min(value, 200);
}

function parsePage(raw: string | null) {
  if (!raw) return 1;
  const value = Number.parseInt(raw, 10);
  if (!Number.isFinite(value) || value <= 0) return 1;
  return value;
}

function normalizeText(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseBoolean(value: string | null) {
  if (!value) return null;
  const lower = value.trim().toLowerCase();
  if (lower === "true" || lower === "1") return true;
  if (lower === "false" || lower === "0") return false;
  return null;
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
    const page = parsePage(searchParams.get("page"));
    const type = normalizeText(searchParams.get("type"));
    const search = normalizeText(searchParams.get("search"));
    const featured = parseBoolean(searchParams.get("featured"));
    const exclude = normalizeText(searchParams.get("exclude"));
    const ids = parseIds(searchParams.get("ids"));

    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let query = supabaseAdmin
      .from("produits")
      .select(PRODUCT_PUBLIC_SELECT, { count: "exact" })
      .eq("status", "published")
      .order("featured", { ascending: false })
      .order("created_at", { ascending: false })
      .range(from, to);

    if (type && ALLOWED_TYPES.has(type)) {
      query = query.eq("type", type);
    }

    if (ids.length > 0) {
      query = query.in("id", ids);
    }

    if (typeof featured === "boolean") {
      query = query.eq("featured", featured);
    }

    if (exclude) {
      query = query.neq("slug", exclude);
    }

    if (search) {
      const safe = search.replace(/,/g, " ");
      query = query.or(`name.ilike.%${safe}%,description.ilike.%${safe}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      throw error;
    }

    const total = count ?? 0;
    const totalPages = total === 0 ? 1 : Math.ceil(total / limit);

    return NextResponse.json({
      data: (data ?? []).map((row) => normalizeProductRecord(row as Record<string, unknown>)),
      meta: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    console.error("Public produits fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les produits publies." },
      { status: 500 },
    );
  }
}
