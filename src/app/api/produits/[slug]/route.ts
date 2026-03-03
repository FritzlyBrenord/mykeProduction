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

export async function GET(
  _: NextRequest,
  context: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await context.params;

    const { data, error } = await supabaseAdmin
      .from("produits")
      .select(PRODUCT_PUBLIC_SELECT)
      .eq("slug", slug)
      .eq("status", "published")
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ error: "Produit introuvable." }, { status: 404 });
      }
      throw error;
    }

    return NextResponse.json(normalizeProductRecord(data as Record<string, unknown>));
  } catch (error) {
    console.error("Public produit detail fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer ce produit." },
      { status: 500 },
    );
  }
}
