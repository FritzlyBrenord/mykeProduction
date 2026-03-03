import { createHash, randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

function hashValue(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeDeviceId(raw: unknown) {
  if (typeof raw !== "string") return null;
  const normalized = raw.trim();
  if (!normalized) return null;
  if (normalized.length > 200) return null;
  return normalized;
}

function normalizePath(raw: unknown) {
  if (typeof raw !== "string") return "/";
  const trimmed = raw.trim();
  if (!trimmed) return "/";
  return trimmed.length > 500 ? trimmed.slice(0, 500) : trimmed;
}

function extractClientIp(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  if (!forwarded) return null;
  const first = forwarded.split(",")[0]?.trim();
  return first || null;
}

function extractCountryCode(request: NextRequest) {
  const raw =
    request.headers.get("x-vercel-ip-country") ||
    request.headers.get("cf-ipcountry") ||
    request.headers.get("x-country-code");
  if (!raw) return null;

  const normalized = raw.trim().toUpperCase();
  if (!/^[A-Z]{2}$/.test(normalized)) return null;
  return normalized;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return NextResponse.json({ tracked: false, reason: "authenticated" });
    }

    let body: unknown = null;
    try {
      body = await request.json();
    } catch {
      body = null;
    }

    const payload = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
    const deviceId = normalizeDeviceId(payload.device_id) ?? randomUUID();
    const path = normalizePath(payload.path);
    const userAgent = request.headers.get("user-agent") || "";
    const ip = extractClientIp(request) || "";
    const countryCode = extractCountryCode(request);
    const visitorSeed = `device:${deviceId}:${userAgent}:${ip}`;
    const visitorKey = hashValue(visitorSeed);
    const nowIso = new Date().toISOString();
    const ipHash = ip ? hashValue(ip) : null;

    const insertPayload = {
      visitor_key: visitorKey,
      user_id: null,
      device_id: deviceId,
      country_code: countryCode,
      user_agent: userAgent || null,
      ip_hash: ipHash,
      first_seen_at: nowIso,
      last_seen_at: nowIso,
      last_path: path,
      total_hits: 1,
      updated_at: nowIso,
    };

    const { error: insertError } = await supabaseAdmin
      .from("visitor_sessions")
      .insert(insertPayload);

    if (insertError?.code === "42P01") {
      return NextResponse.json({
        tracked: false,
        reason: "missing_table",
      });
    }

    if (insertError?.code === "23505") {
      const { data: existing, error: existingError } = await supabaseAdmin
        .from("visitor_sessions")
        .select("total_hits")
        .eq("visitor_key", visitorKey)
        .maybeSingle();

      if (existingError) throw existingError;

      const { error: updateError } = await supabaseAdmin
        .from("visitor_sessions")
        .update({
          device_id: deviceId,
          country_code: countryCode,
          user_agent: userAgent || null,
          ip_hash: ipHash,
          last_path: path,
          last_seen_at: nowIso,
          updated_at: nowIso,
          total_hits: Number((existing as { total_hits?: number | null } | null)?.total_hits || 0) + 1,
        })
        .eq("visitor_key", visitorKey);

      if (updateError) throw updateError;

      return NextResponse.json({ tracked: true, updated: true });
    }

    if (insertError) {
      throw insertError;
    }

    return NextResponse.json({ tracked: true, created: true });
  } catch (error) {
    console.error("Visitor ping error:", error);
    return NextResponse.json({ error: "Impossible de suivre le visiteur." }, { status: 500 });
  }
}
