import { supabaseAdmin } from "@/lib/supabase-admin";

const ORDER_ACCESS_STATUSES = ["paid", "processing", "shipped", "delivered"];
const ITEM_ACCESS_STATUSES = ["paid", "processing", "shipped", "delivered"];

interface AccessInput {
  accessType: "public" | "members" | "paid";
  price: number;
  userId: string | null;
  videoId: string;
}

export interface VideoAccessResult {
  canWatch: boolean;
  requiresAuth: boolean;
  requiresPurchase: boolean;
  purchased: boolean;
}

function chunkArray<T>(input: T[], chunkSize: number) {
  const output: T[][] = [];
  for (let index = 0; index < input.length; index += chunkSize) {
    output.push(input.slice(index, index + chunkSize));
  }
  return output;
}

export async function hasUserPurchasedVideo(userId: string, videoId: string) {
  const { data: userOrders, error: ordersError } = await supabaseAdmin
    .from("commandes")
    .select("id")
    .eq("user_id", userId)
    .is("deleted_at", null)
    .in("status", ORDER_ACCESS_STATUSES)
    .order("created_at", { ascending: false })
    .limit(800);

  if (ordersError) {
    throw ordersError;
  }

  const orderIds = (userOrders ?? [])
    .map((row) => row.id)
    .filter((value): value is string => typeof value === "string");

  if (orderIds.length === 0) {
    return false;
  }

  let hasItemStatusColumn = true;
  const chunks = chunkArray(orderIds, 120);

  for (const chunk of chunks) {
    let query = supabaseAdmin
      .from("commande_items")
      .select("id", { count: "exact", head: true })
      .eq("video_id", videoId)
      .in("commande_id", chunk)
      .limit(1);

    if (hasItemStatusColumn) {
      query = query.in("item_status", ITEM_ACCESS_STATUSES);
    }

    let { count, error } = await query;

    if (error?.code === "42703" && hasItemStatusColumn) {
      hasItemStatusColumn = false;
      const fallback = await supabaseAdmin
        .from("commande_items")
        .select("id", { count: "exact", head: true })
        .eq("video_id", videoId)
        .in("commande_id", chunk)
        .limit(1);
      count = fallback.count;
      error = fallback.error;
    }

    if (error) {
      throw error;
    }

    if (Number(count || 0) > 0) {
      return true;
    }
  }

  return false;
}

export async function resolveVideoAccess({
  accessType,
  price,
  userId,
  videoId,
}: AccessInput): Promise<VideoAccessResult> {
  if (accessType === "public") {
    return {
      canWatch: true,
      requiresAuth: false,
      requiresPurchase: false,
      purchased: false,
    };
  }

  if (accessType === "members") {
    const hasSession = Boolean(userId);
    return {
      canWatch: hasSession,
      requiresAuth: !hasSession,
      requiresPurchase: false,
      purchased: false,
    };
  }

  if (price <= 0) {
    return {
      canWatch: true,
      requiresAuth: false,
      requiresPurchase: false,
      purchased: false,
    };
  }

  if (!userId) {
    return {
      canWatch: false,
      requiresAuth: true,
      requiresPurchase: true,
      purchased: false,
    };
  }

  const purchased = await hasUserPurchasedVideo(userId, videoId);
  return {
    canWatch: purchased,
    requiresAuth: false,
    requiresPurchase: !purchased,
    purchased,
  };
}
