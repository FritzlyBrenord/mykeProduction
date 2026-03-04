import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

const REVENUE_STATUSES = ["paid", "processing", "shipped", "delivered"] as const;

type RevenueOrderRow = {
  id: string;
  status: string;
  total_amount: number | null;
  created_at: string;
  user?: { full_name: string | null }[] | null;
};

function toNumber(value: unknown) {
  const parsed = Number(value || 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function round1(value: number) {
  return Math.round(value * 10) / 10;
}

function percentChange(current: number, previous: number) {
  if (previous <= 0) {
    return current > 0 ? 100 : 0;
  }
  return round1(((current - previous) / previous) * 100);
}

function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(date: Date) {
  return new Intl.DateTimeFormat("fr-FR", { month: "short" }).format(date).replace(".", "");
}

function getMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1));
}

function getNextMonthStart(date: Date) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1));
}

function safeFullName(value: unknown) {
  if (typeof value !== "string") return "Client";
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : "Client";
}

async function fetchRevenueOrders() {
  const query = supabaseAdmin
    .from("commandes")
    .select("id,status,total_amount,created_at,user:profiles(full_name)")
    .in("status", [...REVENUE_STATUSES])
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .limit(5000);

  let { data, error } = await query;

  if (error?.code === "42703") {
    const fallback = await supabaseAdmin
      .from("commandes")
      .select("id,status,total_amount,created_at,user:profiles(full_name)")
      .in("status", [...REVENUE_STATUSES])
      .order("created_at", { ascending: false })
      .limit(5000);
    data = fallback.data;
    error = fallback.error;
  }

  if (error) throw error;
  return (data || []) as RevenueOrderRow[];
}

async function countRowsWithDateRange(params: {
  table: "commandes" | "profiles" | "enrollments";
  dateColumn: "created_at" | "enrolled_at";
  fromIso: string;
  toIso: string;
  withDeletedFilter?: boolean;
}) {
  let query = supabaseAdmin
    .from(params.table)
    .select("id", { count: "exact", head: true })
    .gte(params.dateColumn, params.fromIso)
    .lt(params.dateColumn, params.toIso);

  if (params.withDeletedFilter) {
    query = query.is("deleted_at", null);
  }

  let { count, error } = await query;

  if (error?.code === "42703" && params.withDeletedFilter) {
    const fallback = await supabaseAdmin
      .from(params.table)
      .select("id", { count: "exact", head: true })
      .gte(params.dateColumn, params.fromIso)
      .lt(params.dateColumn, params.toIso);
    count = fallback.count;
    error = fallback.error;
  }

  if (error) throw error;
  return Number(count || 0);
}

export async function GET() {
  try {
    const now = new Date();
    const currentMonthStart = getMonthStart(now);
    const nextMonthStart = getNextMonthStart(now);
    const previousMonthStart = getMonthStart(
      new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1)),
    );

    const revenueOrders = await fetchRevenueOrders();
    const orderIds = revenueOrders.map((row) => row.id);

    const totalRevenue = round1(
      revenueOrders.reduce((sum, row) => sum + toNumber(row.total_amount), 0),
    );

    const totalOrdersCountQuery = supabaseAdmin
      .from("commandes")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    let { count: totalOrders, error: totalOrdersError } = await totalOrdersCountQuery;
    if (totalOrdersError?.code === "42703") {
      const fallback = await supabaseAdmin
        .from("commandes")
        .select("id", { count: "exact", head: true });
      totalOrders = fallback.count;
      totalOrdersError = fallback.error;
    }
    if (totalOrdersError) throw totalOrdersError;

    const { count: totalEnrollments, error: enrollmentsError } = await supabaseAdmin
      .from("enrollments")
      .select("id", { count: "exact", head: true });
    if (enrollmentsError) throw enrollmentsError;

    const totalUsersQuery = supabaseAdmin
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    let { count: totalUsers, error: totalUsersError } = await totalUsersQuery;
    if (totalUsersError?.code === "42703") {
      const fallback = await supabaseAdmin
        .from("profiles")
        .select("id", { count: "exact", head: true });
      totalUsers = fallback.count;
      totalUsersError = fallback.error;
    }
    if (totalUsersError) throw totalUsersError;

    const recentOrders = revenueOrders.slice(0, 5).map((row) => ({
      id: row.id,
      status: row.status,
      amount: toNumber(row.total_amount),
      created_at: row.created_at,
      user: {
        full_name: safeFullName(row.user?.[0]?.full_name),
      },
    }));

    const topFormationsQuery = supabaseAdmin
      .from("formations")
      .select("id,title,rating_avg")
      .eq("status", "published")
      .is("deleted_at", null)
      .limit(200);

    let { data: topFormationsRows, error: topFormationsError } = await topFormationsQuery;
    if (topFormationsError?.code === "42703") {
      const fallback = await supabaseAdmin
        .from("formations")
        .select("id,title,rating_avg")
        .eq("status", "published")
        .limit(200);
      topFormationsRows = fallback.data;
      topFormationsError = fallback.error;
    }
    if (topFormationsError) throw topFormationsError;

    const formationsWithRealEnrollments = await Promise.all(
      ((topFormationsRows || []) as Array<{ id: string; title: string; rating_avg: number | null }>).map(
        async (formation) => {
          const { count, error } = await supabaseAdmin
            .from("enrollments")
            .select("id", { count: "exact", head: true })
            .eq("formation_id", formation.id);

          if (error) throw error;

          return {
            id: formation.id,
            title: formation.title,
            enrollments: Number(count || 0),
            rating: round1(toNumber(formation.rating_avg)),
          };
        },
      ),
    );

    const topFormations = formationsWithRealEnrollments
      .sort((a, b) => {
        if (b.enrollments !== a.enrollments) return b.enrollments - a.enrollments;
        return b.rating - a.rating;
      })
      .slice(0, 5);

    const revenueByMonthMap = new Map<string, { month: string; revenue: number }>();
    for (let i = 11; i >= 0; i -= 1) {
      const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
      revenueByMonthMap.set(monthKey(d), { month: monthLabel(d), revenue: 0 });
    }

    for (const order of revenueOrders) {
      const created = new Date(order.created_at);
      const key = monthKey(created);
      const bucket = revenueByMonthMap.get(key);
      if (!bucket) continue;
      bucket.revenue = round1(bucket.revenue + toNumber(order.total_amount));
    }

    const revenueByMonth = Array.from(revenueByMonthMap.values());

    let revenueByTypeRaw: Array<{
      item_type: "produit" | "formation" | "video";
      total_price: number | null;
      quantity: number | null;
      unit_price: number | null;
    }> = [];

    if (orderIds.length > 0) {
      const { data: itemRows, error: itemError } = await supabaseAdmin
        .from("commande_items")
        .select("item_type,total_price,quantity,unit_price")
        .in("commande_id", orderIds)
        .limit(15000);

      if (itemError && itemError.code !== "42P01") {
        throw itemError;
      }

      revenueByTypeRaw = (itemRows || []) as typeof revenueByTypeRaw;
    }

    const typeAmounts = {
      produit: 0,
      formation: 0,
      video: 0,
    };

    for (const item of revenueByTypeRaw) {
      const amount =
        toNumber(item.total_price) > 0
          ? toNumber(item.total_price)
          : toNumber(item.unit_price) * Math.max(1, toNumber(item.quantity));
      if (item.item_type in typeAmounts) {
        typeAmounts[item.item_type] += amount;
      }
    }

    const totalTypeRevenue = Object.values(typeAmounts).reduce((sum, value) => sum + value, 0);
    const revenueByType = [
      { type: "Produits", value: totalTypeRevenue > 0 ? round1((typeAmounts.produit / totalTypeRevenue) * 100) : 0 },
      { type: "Formations", value: totalTypeRevenue > 0 ? round1((typeAmounts.formation / totalTypeRevenue) * 100) : 0 },
      { type: "Videos", value: totalTypeRevenue > 0 ? round1((typeAmounts.video / totalTypeRevenue) * 100) : 0 },
    ];

    const currentMonthRevenue = revenueOrders
      .filter((order) => {
        const created = new Date(order.created_at).getTime();
        return created >= currentMonthStart.getTime() && created < nextMonthStart.getTime();
      })
      .reduce((sum, order) => sum + toNumber(order.total_amount), 0);

    const previousMonthRevenue = revenueOrders
      .filter((order) => {
        const created = new Date(order.created_at).getTime();
        return created >= previousMonthStart.getTime() && created < currentMonthStart.getTime();
      })
      .reduce((sum, order) => sum + toNumber(order.total_amount), 0);

    const [currentMonthOrders, previousMonthOrders, currentMonthEnrollments, previousMonthEnrollments, currentMonthUsers, previousMonthUsers] =
      await Promise.all([
        countRowsWithDateRange({
          table: "commandes",
          dateColumn: "created_at",
          fromIso: currentMonthStart.toISOString(),
          toIso: nextMonthStart.toISOString(),
          withDeletedFilter: true,
        }),
        countRowsWithDateRange({
          table: "commandes",
          dateColumn: "created_at",
          fromIso: previousMonthStart.toISOString(),
          toIso: currentMonthStart.toISOString(),
          withDeletedFilter: true,
        }),
        countRowsWithDateRange({
          table: "enrollments",
          dateColumn: "enrolled_at",
          fromIso: currentMonthStart.toISOString(),
          toIso: nextMonthStart.toISOString(),
        }),
        countRowsWithDateRange({
          table: "enrollments",
          dateColumn: "enrolled_at",
          fromIso: previousMonthStart.toISOString(),
          toIso: currentMonthStart.toISOString(),
        }),
        countRowsWithDateRange({
          table: "profiles",
          dateColumn: "created_at",
          fromIso: currentMonthStart.toISOString(),
          toIso: nextMonthStart.toISOString(),
          withDeletedFilter: true,
        }),
        countRowsWithDateRange({
          table: "profiles",
          dateColumn: "created_at",
          fromIso: previousMonthStart.toISOString(),
          toIso: currentMonthStart.toISOString(),
          withDeletedFilter: true,
        }),
      ]);

    return NextResponse.json({
      totalRevenue,
      totalOrders: Number(totalOrders || 0),
      totalEnrollments: Number(totalEnrollments || 0),
      totalUsers: Number(totalUsers || 0),
      kpiChanges: {
        revenue: percentChange(currentMonthRevenue, previousMonthRevenue),
        orders: percentChange(currentMonthOrders, previousMonthOrders),
        enrollments: percentChange(currentMonthEnrollments, previousMonthEnrollments),
        users: percentChange(currentMonthUsers, previousMonthUsers),
      },
      revenueByMonth,
      revenueByType,
      recentOrders,
      topFormations,
      topProducts: [],
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Dashboard stats error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les statistiques du dashboard." },
      { status: 500 },
    );
  }
}
