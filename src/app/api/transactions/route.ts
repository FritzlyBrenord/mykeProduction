import { createClient } from "@/lib/supabase/server";
import { supabaseAdmin } from "@/lib/supabase-admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { data: payments, error: paymentsError } = await (supabaseAdmin
      .from("paiements") as any)
      .select("id,commande_id,amount,provider,status,metadata,created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(200);

    if (paymentsError) {
      throw paymentsError;
    }

    const orderIds = (payments ?? [])
      .map((payment: any) => payment.commande_id)
      .filter((value: unknown): value is string => typeof value === "string" && value.length > 0);

    const orderById = new Map<
      string,
      { id: string; status: string; currency: string; total_amount: number; created_at: string }
    >();

    if (orderIds.length > 0) {
      const { data: orders, error: ordersError } = await (supabaseAdmin
        .from("commandes") as any)
        .select("id,status,currency,total_amount,created_at")
        .in("id", Array.from(new Set(orderIds)));

      if (ordersError) {
        console.error("Transactions order fetch warning:", ordersError);
      } else {
        (orders ?? []).forEach((order: any) => {
          orderById.set(order.id as string, {
            id: order.id as string,
            status: (order.status as string) || "pending",
            currency: (order.currency as string) || "USD",
            total_amount: Number(order.total_amount || 0),
            created_at: order.created_at as string,
          });
        });
      }
    }

    const rows = (payments ?? []).map((payment: any) => {
      const orderId = (payment.commande_id as string | null) ?? null;
      return {
        id: payment.id as string,
        order_id: orderId,
        amount: Number(payment.amount || 0),
        provider: (payment.provider as "stripe" | "paypal") || "stripe",
        status: (payment.status as "pending" | "success" | "failed" | "refunded" | null) ?? "pending",
        created_at: payment.created_at as string,
        metadata:
          payment.metadata && typeof payment.metadata === "object"
            ? (payment.metadata as Record<string, unknown>)
            : null,
        order: orderId ? (orderById.get(orderId) ?? null) : null,
      };
    });

    return NextResponse.json(rows);
  } catch (error) {
    console.error("Transactions fetch error:", error);
    return NextResponse.json(
      { error: "Impossible de recuperer les transactions." },
      { status: 500 },
    );
  }
}
