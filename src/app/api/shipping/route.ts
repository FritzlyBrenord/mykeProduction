import {
  detectCountryCode,
  resolveShippingRule,
  sortShippingRules,
  SHIPPING_DEFAULT_COUNTRY_CODE,
  type ShippingRule,
} from "@/lib/shipping";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const { data, error } = await supabaseAdmin
      .from("shipping_settings")
      .select("id, country_code, country_name, base_fee, free_threshold, priority, is_active, created_at, updated_at")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) throw error;

    const rules = sortShippingRules((data ?? []) as ShippingRule[]);
    const detectedCountry = detectCountryCode(request.headers) || "";
    const matched = resolveShippingRule(rules, detectedCountry);

    return NextResponse.json({
      detectedCountry,
      appliedCountryCode: matched.rule?.country_code ?? SHIPPING_DEFAULT_COUNTRY_CODE,
      matchedRule: matched.rule,
      usesFallbackRule: matched.isFallbackRule,
      rules,
    });
  } catch (error) {
    console.error("Public shipping settings fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les regles de livraison." },
      { status: 500 },
    );
  }
}
