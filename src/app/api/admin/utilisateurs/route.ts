import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { checkAdminAccess } from "@/lib/auth/admin-access";
import { createAdminClient } from "@/lib/supabase/admin";

type VisitorPeriod = "day" | "week" | "month" | "year";
type VisitorSource = "article" | "video" | "cart" | "site";

type VisitorAggregate = {
  id: string;
  first_seen: string;
  last_seen: string;
  sources: Set<VisitorSource>;
  user_agent: string | null;
  ip_hash: string | null;
  country_code: string | null;
  events: number;
};

type VisitorEvent = {
  id: string;
  at: string;
};

function normalizeSearch(value: string | null) {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parsePositiveInt(value: string | null, fallback: number, max: number) {
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
  return Math.min(parsed, max);
}

function normalizeRole(value: string | null) {
  if (value === "admin" || value === "client") return value;
  return "all";
}

function normalizeRoleInput(value: unknown) {
  if (value === "admin" || value === "client") return value;
  return null;
}

function normalizeEmailInput(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) return null;
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return null;
  return trimmed;
}

function normalizeFullNameInput(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed.slice(0, 120) : null;
}

function normalizePeriod(value: string | null): VisitorPeriod {
  if (value === "day" || value === "week" || value === "month" || value === "year") {
    return value;
  }
  return "day";
}

function getUtcDayStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function getPeriodStart(period: VisitorPeriod, now: Date) {
  if (period === "day") {
    return getUtcDayStart(now);
  }

  if (period === "week") {
    const dayStart = getUtcDayStart(now);
    const day = dayStart.getUTCDay();
    const diff = day === 0 ? 6 : day - 1;
    dayStart.setUTCDate(dayStart.getUTCDate() - diff);
    return dayStart;
  }

  if (period === "month") {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  }

  return new Date(Date.UTC(now.getUTCFullYear(), 0, 1));
}

function isMissingTableError(error: unknown) {
  if (!error || typeof error !== "object") return false;
  const code = (error as { code?: string }).code;
  return code === "42P01" || code === "42703";
}

async function countUsersByRole(role?: "admin" | "client") {
  let query = supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null);

  if (role) {
    query = query.eq("role", role);
  }

  const { count, error } = await query;
  if (error) throw error;
  return Number(count || 0);
}

async function countUsersByActive(active: boolean) {
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .eq("is_active", active);

  if (error) throw error;
  return Number(count || 0);
}

async function countTodayRegistrations(todayStartIso: string) {
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .is("deleted_at", null)
    .gte("created_at", todayStartIso);

  if (error) throw error;
  return Number(count || 0);
}

async function fetchAnonymousRowsSince(sinceIso: string) {
  const rawEvents: Array<VisitorEvent & { source: VisitorSource; user_agent?: string | null; ip_hash?: string | null }> = [];
  const visitors = new Map<string, VisitorAggregate>();

  const mergeEvent = (
    key: string,
    at: string,
    source: VisitorSource,
    userAgent: string | null = null,
    ipHash: string | null = null,
    countryCode: string | null = null,
    eventCount = 1,
  ) => {
    rawEvents.push({ id: key, at, source, user_agent: userAgent, ip_hash: ipHash });

    const existing = visitors.get(key);
    if (!existing) {
      visitors.set(key, {
        id: key,
        first_seen: at,
        last_seen: at,
        sources: new Set<VisitorSource>([source]),
        user_agent: userAgent,
        ip_hash: ipHash,
        country_code: countryCode,
        events: eventCount,
      });
      return;
    }

    if (new Date(at).getTime() < new Date(existing.first_seen).getTime()) {
      existing.first_seen = at;
    }
    if (new Date(at).getTime() > new Date(existing.last_seen).getTime()) {
      existing.last_seen = at;
      existing.user_agent = userAgent || existing.user_agent;
      existing.ip_hash = ipHash || existing.ip_hash;
      existing.country_code = countryCode || existing.country_code;
    }
    existing.sources.add(source);
    existing.events += eventCount;
  };

  const { data: articleRows, error: articleError } = await supabaseAdmin
    .from("article_views")
    .select("viewer_key,created_at,last_viewed_at,user_agent,ip_hash")
    .is("user_id", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (articleError && !isMissingTableError(articleError)) {
    throw articleError;
  }

  for (const row of (articleRows || []) as Array<{
    viewer_key: string | null;
    created_at: string | null;
    last_viewed_at: string | null;
    user_agent: string | null;
    ip_hash: string | null;
  }>) {
    if (!row.viewer_key) continue;
    const at = row.last_viewed_at || row.created_at;
    if (!at) continue;
    mergeEvent(row.viewer_key, at, "article", row.user_agent, row.ip_hash);
  }

  const { data: videoRows, error: videoError } = await supabaseAdmin
    .from("video_views")
    .select("viewer_key,created_at,last_viewed_at,user_agent,ip_hash")
    .is("user_id", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (videoError && !isMissingTableError(videoError)) {
    throw videoError;
  }

  for (const row of (videoRows || []) as Array<{
    viewer_key: string | null;
    created_at: string | null;
    last_viewed_at: string | null;
    user_agent: string | null;
    ip_hash: string | null;
  }>) {
    if (!row.viewer_key) continue;
    const at = row.last_viewed_at || row.created_at;
    if (!at) continue;
    mergeEvent(row.viewer_key, at, "video", row.user_agent, row.ip_hash);
  }

  const { data: cartRows, error: cartError } = await supabaseAdmin
    .from("carts")
    .select("session_id,created_at,updated_at")
    .is("user_id", null)
    .not("session_id", "is", null)
    .gte("created_at", sinceIso)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (cartError && !isMissingTableError(cartError)) {
    throw cartError;
  }

  for (const row of (cartRows || []) as Array<{
    session_id: string | null;
    created_at: string | null;
    updated_at: string | null;
  }>) {
    if (!row.session_id) continue;
    const at = row.updated_at || row.created_at;
    if (!at) continue;
    mergeEvent(row.session_id, at, "cart");
  }

  const { data: sessionRows, error: sessionError } = await supabaseAdmin
    .from("visitor_sessions")
    .select("visitor_key,first_seen_at,last_seen_at,user_agent,ip_hash,country_code,total_hits")
    .is("user_id", null)
    .gte("last_seen_at", sinceIso)
    .order("last_seen_at", { ascending: false })
    .limit(10000);

  if (sessionError && !isMissingTableError(sessionError)) {
    throw sessionError;
  }

  for (const row of (sessionRows || []) as Array<{
    visitor_key: string | null;
    first_seen_at: string | null;
    last_seen_at: string | null;
    user_agent: string | null;
    ip_hash: string | null;
    country_code: string | null;
    total_hits: number | null;
  }>) {
    if (!row.visitor_key) continue;
    const at = row.last_seen_at || row.first_seen_at;
    if (!at) continue;
    mergeEvent(
      row.visitor_key,
      at,
      "site",
      row.user_agent,
      row.ip_hash,
      row.country_code,
      Math.max(1, Number(row.total_hits || 1)),
    );
  }

  return { rawEvents, visitors };
}

function countUniqueVisitorsSince(events: VisitorEvent[], since: Date) {
  const set = new Set<string>();
  const sinceMs = since.getTime();
  for (const event of events) {
    if (new Date(event.at).getTime() >= sinceMs) {
      set.add(event.id);
    }
  }
  return set.size;
}

function buildDailyTrend(events: VisitorEvent[], days: number) {
  const output: Array<{ date: string; visitors: number }> = [];
  const now = new Date();

  for (let i = days - 1; i >= 0; i -= 1) {
    const dayStart = getUtcDayStart(now);
    dayStart.setUTCDate(dayStart.getUTCDate() - i);
    const nextDay = new Date(dayStart);
    nextDay.setUTCDate(nextDay.getUTCDate() + 1);

    const dayStartMs = dayStart.getTime();
    const nextDayMs = nextDay.getTime();
    const set = new Set<string>();

    for (const event of events) {
      const ts = new Date(event.at).getTime();
      if (ts >= dayStartMs && ts < nextDayMs) {
        set.add(event.id);
      }
    }

    output.push({
      date: dayStart.toISOString().slice(0, 10),
      visitors: set.size,
    });
  }

  return output;
}

export async function GET(request: NextRequest) {
  try {
    const access = await checkAdminAccess();
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.code },
        { status: access.status },
      );
    }

    const { searchParams } = new URL(request.url);

    const search = normalizeSearch(searchParams.get("search"));
    const role = normalizeRole(searchParams.get("role"));
    const period = normalizePeriod(searchParams.get("period"));
    const page = parsePositiveInt(searchParams.get("page"), 1, 1000);
    const limit = parsePositiveInt(searchParams.get("limit"), 20, 100);
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    let usersQuery = supabaseAdmin
      .from("profiles")
      .select(
        "id,full_name,avatar_url,role,is_active,two_fa_enabled,last_login_at,created_at,updated_at",
        { count: "exact" },
      )
      .is("deleted_at", null)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (role !== "all") {
      usersQuery = usersQuery.eq("role", role);
    }

    if (search) {
      const safe = search.replace(/,/g, " ");
      usersQuery = usersQuery.or(`full_name.ilike.%${safe}%`);
    }

    const { data: usersRows, error: usersError, count: usersCount } = await usersQuery;
    if (usersError) throw usersError;

    const adminClient = createAdminClient();
    if (!adminClient) {
      throw new Error("Failed to initialize admin client");
    }
    const usersWithEmails = await Promise.all(
      (
        (usersRows || []) as Array<{
          id: string;
          full_name: string | null;
          avatar_url: string | null;
          role: "admin" | "client";
          is_active: boolean;
          two_fa_enabled: boolean;
          last_login_at: string | null;
          created_at: string;
          updated_at: string;
        }>
      ).map(async (row) => {
        const { data: authUserData, error: authUserError } =
          await adminClient.auth.admin.getUserById(row.id);

        if (authUserError) {
          console.error("Admin users list auth lookup error:", authUserError);
        }

        return {
          ...row,
          email: authUserData.user?.email ?? null,
        };
      }),
    );

    const now = new Date();
    const dayStart = getPeriodStart("day", now);
    const weekStart = getPeriodStart("week", now);
    const monthStart = getPeriodStart("month", now);
    const yearStart = getPeriodStart("year", now);

    const [
      totalUsers,
      adminsTotal,
      clientsTotal,
      activeTotal,
      inactiveTotal,
      todayRegistrations,
      visitorData,
    ] =
      await Promise.all([
        countUsersByRole(),
        countUsersByRole("admin"),
        countUsersByRole("client"),
        countUsersByActive(true),
        countUsersByActive(false),
        countTodayRegistrations(dayStart.toISOString()),
        fetchAnonymousRowsSince(yearStart.toISOString()),
      ]);

    const visitorEvents = visitorData.rawEvents.map((event) => ({ id: event.id, at: event.at }));
    const visitorsToday = countUniqueVisitorsSince(visitorEvents, dayStart);
    const visitorsWeek = countUniqueVisitorsSince(visitorEvents, weekStart);
    const visitorsMonth = countUniqueVisitorsSince(visitorEvents, monthStart);
    const visitorsYear = countUniqueVisitorsSince(visitorEvents, yearStart);

    const periodStart = getPeriodStart(period, now);
    const periodStartMs = periodStart.getTime();

    const visitors = Array.from(visitorData.visitors.values())
      .filter((row) => new Date(row.last_seen).getTime() >= periodStartMs)
      .sort((a, b) => new Date(b.last_seen).getTime() - new Date(a.last_seen).getTime())
      .slice(0, 200)
      .map((row) => ({
        id: row.id,
        first_seen: row.first_seen,
        last_seen: row.last_seen,
        sources: Array.from(row.sources),
        user_agent: row.user_agent,
        ip_hash: row.ip_hash,
        country_code: row.country_code,
        events: row.events,
      }));

    const dailyTrend = buildDailyTrend(visitorEvents, 14);

    return NextResponse.json({
      data: {
        users: usersWithEmails,
        visitors,
        visitor_daily: dailyTrend,
        stats: {
          users_total: totalUsers,
          admins_total: adminsTotal,
          clients_total: clientsTotal,
          active_total: activeTotal,
          inactive_total: inactiveTotal,
          registrations_today: todayRegistrations,
          visitors_today: visitorsToday,
          visitors_week: visitorsWeek,
          visitors_month: visitorsMonth,
          visitors_year: visitorsYear,
        },
        acting_admin: {
          id: access.userId,
          email: access.email,
          full_name: access.profile.full_name,
        },
      },
      meta: {
        page,
        limit,
        total: Number(usersCount || 0),
        totalPages: Math.max(1, Math.ceil(Number(usersCount || 0) / limit)),
        period,
      },
    });
  } catch (error) {
    console.error("Admin utilisateurs fetch error:", error);
    const message = error instanceof Error ? error.message : "Failed to fetch utilisateurs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const access = await checkAdminAccess();
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.code },
        { status: access.status },
      );
    }

    const body = (await request.json()) as Record<string, unknown>;
    const email = normalizeEmailInput(body.email);
    const password = typeof body.password === "string" ? body.password : "";
    const fullName = normalizeFullNameInput(body.full_name);
    const role = normalizeRoleInput(body.role) ?? "client";
    const isActive = body.is_active !== false;

    if (!email) {
      return NextResponse.json({ error: "Email invalide." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json(
        { error: "Le mot de passe doit contenir au moins 8 caracteres." },
        { status: 400 },
      );
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      throw new Error("Failed to initialize admin client");
    }
    const { data: createdAuthUser, error: createUserError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        app_metadata: { role },
        user_metadata: {
          full_name: fullName,
          role,
        },
      });

    if (createUserError || !createdAuthUser.user) {
      return NextResponse.json(
        {
          error:
            createUserError?.message ||
            "Impossible de creer le compte utilisateur.",
        },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const { error: profileError } = await supabaseAdmin.from("profiles").upsert(
      {
        id: createdAuthUser.user.id,
        full_name: fullName,
        role,
        is_active: isActive,
        deleted_at: null,
        updated_at: nowIso,
      },
      { onConflict: "id" },
    );

    if (profileError) {
      await adminClient.auth.admin.deleteUser(createdAuthUser.user.id);
      throw profileError;
    }

    await supabaseAdmin.from("audit_logs").insert({
      user_id: access.userId,
      action: "create",
      table_name: "profiles",
      record_id: createdAuthUser.user.id,
      new_data: {
        id: createdAuthUser.user.id,
        email,
        full_name: fullName,
        role,
        is_active: isActive,
      },
    });

    return NextResponse.json(
      {
        success: true,
        user: {
          id: createdAuthUser.user.id,
          email,
          full_name: fullName,
          role,
          is_active: isActive,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    console.error("Admin utilisateurs create error:", error);
    const message = error instanceof Error ? error.message : "Failed to create user";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const access = await checkAdminAccess();
    if (!access.ok) {
      return NextResponse.json(
        { error: access.message, code: access.code },
        { status: access.status },
      );
    }

    const body = (await request.json()) as { ids?: string[]; target?: "users" | "visitors" };
    const ids = Array.isArray(body.ids)
      ? body.ids
          .map((value) => value?.trim())
          .filter((value): value is string => Boolean(value))
          .slice(0, 500)
      : [];
    const target = body.target === "visitors" ? "visitors" : "users";

    if (ids.length === 0) {
      return NextResponse.json(
        { error: target === "visitors" ? "Aucun visiteur selectionne." : "Aucun utilisateur selectionne." },
        { status: 400 },
      );
    }

    if (target === "visitors") {
      const deletedCounts = {
        visitor_sessions: 0,
        article_views: 0,
        video_views: 0,
        carts: 0,
      };

      const { data: deletedSessions, error: sessionsError } = await supabaseAdmin
        .from("visitor_sessions")
        .delete()
        .in("visitor_key", ids)
        .is("user_id", null)
        .select("visitor_key");
      if (sessionsError && !isMissingTableError(sessionsError)) throw sessionsError;
      deletedCounts.visitor_sessions = (deletedSessions || []).length;

      const { data: deletedArticleViews, error: articleError } = await supabaseAdmin
        .from("article_views")
        .delete()
        .in("viewer_key", ids)
        .is("user_id", null)
        .select("viewer_key");
      if (articleError && !isMissingTableError(articleError)) throw articleError;
      deletedCounts.article_views = (deletedArticleViews || []).length;

      const { data: deletedVideoViews, error: videoError } = await supabaseAdmin
        .from("video_views")
        .delete()
        .in("viewer_key", ids)
        .is("user_id", null)
        .select("viewer_key");
      if (videoError && !isMissingTableError(videoError)) throw videoError;
      deletedCounts.video_views = (deletedVideoViews || []).length;

      const { data: deletedCarts, error: cartsError } = await supabaseAdmin
        .from("carts")
        .delete()
        .in("session_id", ids)
        .is("user_id", null)
        .select("session_id");
      if (cartsError && !isMissingTableError(cartsError)) throw cartsError;
      deletedCounts.carts = (deletedCarts || []).length;

      await supabaseAdmin.from("audit_logs").insert({
        user_id: access.userId,
        action: "delete",
        table_name: "anonymous_visitors",
        new_data: { ids, mode: "bulk_delete", deleted_counts: deletedCounts },
      });

      return NextResponse.json({
        success: true,
        target: "visitors",
        deleted_ids: ids,
        deleted_counts: deletedCounts,
      });
    }

    if (ids.includes(access.userId)) {
      return NextResponse.json(
        { error: "Vous ne pouvez pas supprimer votre propre compte." },
        { status: 400 },
      );
    }

    const { data: adminRows, error: adminCheckError } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .in("id", ids)
      .eq("role", "admin")
      .is("deleted_at", null);

    if (adminCheckError) throw adminCheckError;

    if ((adminRows || []).length > 0) {
      return NextResponse.json(
        { error: "Suppression des comptes administrateur non autorisee." },
        { status: 400 },
      );
    }

    const nowIso = new Date().toISOString();
    const { data: deletedRows, error: deleteError } = await supabaseAdmin
      .from("profiles")
      .update({
        is_active: false,
        deleted_at: nowIso,
        updated_at: nowIso,
      })
      .in("id", ids)
      .is("deleted_at", null)
      .select("id");

    if (deleteError) throw deleteError;

    const deletedIds = (deletedRows || []).map((row) => row.id);

    if (deletedIds.length > 0) {
      await supabaseAdmin.from("audit_logs").insert({
        user_id: access.userId,
        action: "delete",
        table_name: "profiles",
        new_data: { ids: deletedIds, mode: "bulk_soft_delete" },
      });
    }

    return NextResponse.json({
      success: true,
      target: "users",
      deleted_count: deletedIds.length,
      deleted_ids: deletedIds,
    });
  } catch (error) {
    console.error("Admin utilisateurs bulk delete error:", error);
    const message = error instanceof Error ? error.message : "Failed to delete users";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
