import { supabaseAdmin } from "@/lib/supabase-admin";
import {
  getShippingCountryLabel,
  normalizeCountryCode,
  normalizeShippingRule,
  SHIPPING_DEFAULT_COUNTRY_CODE,
} from "@/lib/shipping";
import { NextRequest, NextResponse } from "next/server";

function hasOwn(record: Record<string, unknown>, key: string) {
  return Object.prototype.hasOwnProperty.call(record, key);
}

function parseNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, parsed) : null;
}

function parsePriority(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(1, Math.floor(parsed)) : null;
}

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const body = await request.json().catch(() => ({}));
    const payload =
      typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};

    const { data: currentRule, error: currentRuleError } = await supabaseAdmin
      .from("shipping_settings")
      .select("id, country_code, country_name, base_fee, free_threshold, priority, is_active, created_at, updated_at")
      .eq("id", id)
      .maybeSingle();

    if (currentRuleError) throw currentRuleError;

    if (!currentRule) {
      return NextResponse.json({ error: "Regle introuvable." }, { status: 404 });
    }

    const nextCountryCode = hasOwn(payload, "country_code")
      ? normalizeCountryCode(payload.country_code)
      : currentRule.country_code;

    if (!nextCountryCode) {
      return NextResponse.json(
        { error: "Choisissez un pays valide pour la regle." },
        { status: 400 },
      );
    }

    const nextBaseFee = hasOwn(payload, "base_fee")
      ? parseNumber(payload.base_fee)
      : Number(currentRule.base_fee);
    const nextFreeThreshold = hasOwn(payload, "free_threshold")
      ? parseNumber(payload.free_threshold)
      : Number(currentRule.free_threshold);
    const nextPriority = hasOwn(payload, "priority")
      ? parsePriority(payload.priority)
      : Number(currentRule.priority);
    const nextIsActive =
      nextCountryCode === SHIPPING_DEFAULT_COUNTRY_CODE
        ? true
        : hasOwn(payload, "is_active")
          ? Boolean(payload.is_active)
          : Boolean(currentRule.is_active);

    if (nextBaseFee === null || nextFreeThreshold === null || nextPriority === null) {
      return NextResponse.json(
        { error: "Les valeurs numeriques de la regle sont invalides." },
        { status: 400 },
      );
    }

    const normalizedRule = normalizeShippingRule({
      id,
      country_code: nextCountryCode,
      country_name: getShippingCountryLabel(nextCountryCode),
      base_fee: nextBaseFee,
      free_threshold: nextFreeThreshold,
      is_active: nextIsActive,
      priority:
        nextCountryCode === SHIPPING_DEFAULT_COUNTRY_CODE ? 9999 : nextPriority,
      created_at: currentRule.created_at,
      updated_at: new Date().toISOString(),
    });

    const { data, error } = await supabaseAdmin
      .from("shipping_settings")
      .update({
        country_code: normalizedRule.country_code,
        country_name: normalizedRule.country_name,
        base_fee: normalizedRule.base_fee,
        free_threshold: normalizedRule.free_threshold,
        is_active: normalizedRule.is_active,
        priority: normalizedRule.priority,
        updated_at: normalizedRule.updated_at,
      })
      .eq("id", id)
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
    console.error("Admin shipping settings update error:", error);
    return NextResponse.json(
      { error: "Impossible de modifier cette regle de livraison." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;

    const { data: rule, error: fetchError } = await supabaseAdmin
      .from("shipping_settings")
      .select("country_code")
      .eq("id", id)
      .maybeSingle();

    if (fetchError) throw fetchError;

    if (!rule) {
      return NextResponse.json({ error: "Regle introuvable." }, { status: 404 });
    }

    if (rule.country_code === SHIPPING_DEFAULT_COUNTRY_CODE) {
      return NextResponse.json(
        { error: "La regle globale ne peut pas etre supprimee." },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("shipping_settings")
      .delete()
      .eq("id", id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Admin shipping settings deletion error:", error);
    return NextResponse.json(
      { error: "Impossible de supprimer cette regle de livraison." },
      { status: 500 },
    );
  }
}
