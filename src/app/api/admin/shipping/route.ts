import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getShippingCountryLabel,
  normalizeCountryCode,
  normalizeShippingRule,
  sortShippingRules,
  type ShippingRule,
  SHIPPING_DEFAULT_COUNTRY_CODE,
} from "@/lib/shipping";
import { NextRequest, NextResponse } from "next/server";

function parseBoolean(value: unknown, fallback: boolean) {
  if (typeof value === "boolean") return value;
  return fallback;
}

function parseNonNegativeNumber(value: unknown, fallback: number) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
}

async function getNextPriority() {
  const { data, error } = await supabaseAdmin
    .from("shipping_settings")
    .select("priority")
    .neq("country_code", SHIPPING_DEFAULT_COUNTRY_CODE)
    .order("priority", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;

  const current = typeof data?.priority === "number" ? data.priority : 0;
  return Math.max(1, current + 1);
}

export async function GET() {
  try {
    const { data, error } = await supabaseAdmin
      .from("shipping_settings")
      .select("id, country_code, country_name, base_fee, free_threshold, priority, is_active, created_at, updated_at")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json(sortShippingRules((data ?? []) as ShippingRule[]));
  } catch (error) {
    console.error("Admin shipping settings fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les parametres de livraison." },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const countryCode = normalizeCountryCode(body?.country_code);

    if (!countryCode) {
      return NextResponse.json(
        { error: "Choisissez un pays valide pour la regle." },
        { status: 400 },
      );
    }

    const baseFee = parseNonNegativeNumber(body?.base_fee, 0);
    const freeThreshold = parseNonNegativeNumber(body?.free_threshold, 0);
    const isActive =
      countryCode === SHIPPING_DEFAULT_COUNTRY_CODE
        ? true
        : parseBoolean(body?.is_active, true);
    const priority =
      countryCode === SHIPPING_DEFAULT_COUNTRY_CODE ? 9999 : await getNextPriority();

    const payload = normalizeShippingRule({
      country_code: countryCode,
      country_name: getShippingCountryLabel(countryCode),
      base_fee: baseFee,
      free_threshold: freeThreshold,
      is_active: isActive,
      priority,
    });

    const { data, error } = await supabaseAdmin
      .from("shipping_settings")
      .insert(payload)
      .select("id, country_code, country_name, base_fee, free_threshold, priority, is_active, created_at, updated_at")
      .single();

    if (error?.code === "23505") {
      return NextResponse.json(
        { error: "Une regle existe deja pour ce pays." },
        { status: 409 },
      );
    }

    if (error) throw error;

    return NextResponse.json(normalizeShippingRule(data));
  } catch (error) {
    console.error("Admin shipping settings creation error:", error);
    return NextResponse.json(
      { error: "Impossible de creer cette regle de livraison." },
      { status: 500 },
    );
  }
}
