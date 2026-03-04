import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

type ItemType = "produit" | "formation" | "video";

type PaymentRecord = {
  id: string;
  user_id: string | null;
  commande_id: string | null;
  amount: number;
  provider: "stripe" | "paypal";
  status: "pending" | "success" | "failed" | "refunded";
  metadata: Record<string, unknown> | null;
  created_at: string;
  customer: {
    id: string | null;
    full_name: string | null;
    email: string | null;
  };
  order: {
    id: string | null;
    status: string | null;
    total_amount: number | null;
    currency: string | null;
    created_at: string | null;
  };
  items: Array<{
    item_type: ItemType;
    label: string;
    quantity: number;
    total_price: number;
    product_type: "chimique" | "document" | "autre" | null;
    is_digital: boolean | null;
  }>;
  summary: {
    item_types: ItemType[];
    total_quantity: number;
    total_items_amount: number;
    contains_physical_product: boolean;
  };
};

function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function normalizeItemType(value: unknown): ItemType {
  if (value === "produit" || value === "formation" || value === "video") {
    return value;
  }
  return "produit";
}

function itemLabelFromRow(row: {
  item_type: ItemType;
  produit?: { name: string | null } | { name: string | null }[] | null;
  formation?: { title: string | null } | { title: string | null }[] | null;
  video?: { title: string | null } | { title: string | null }[] | null;
}) {
  if (row.item_type === "formation") {
    return getSingleRelation(row.formation)?.title || "Formation";
  }
  if (row.item_type === "video") {
    return getSingleRelation(row.video)?.title || "Video";
  }
  return getSingleRelation(row.produit)?.name || "Produit";
}

// GET /api/admin/paiements - list enriched payment transactions.
export async function GET(_request: NextRequest) {
  try {
    const { data: paymentsRaw, error: paymentsError } = await supabaseAdmin
      .from("paiements")
      .select(
        `
          id,
          user_id,
          commande_id,
          amount,
          provider,
          status,
          metadata,
          created_at,
          customer:profiles(id,full_name),
          order:commandes(id,status,total_amount,currency,created_at,shipping_address)
        `,
      )
      .order("created_at", { ascending: false });

    if (paymentsError) throw paymentsError;

    const payments = (paymentsRaw ?? []) as Array<{
      id: string;
      user_id: string | null;
      commande_id: string | null;
      amount: number | null;
      provider: "stripe" | "paypal" | null;
      status: "pending" | "success" | "failed" | "refunded" | null;
      metadata: unknown;
      created_at: string;
      customer:
        | { id: string | null; full_name: string | null }
        | { id: string | null; full_name: string | null }[]
        | null;
      order:
        | {
            id: string;
            status: string | null;
            total_amount: number | null;
            currency: string | null;
            created_at: string | null;
            shipping_address: Record<string, unknown> | null;
          }
        | {
            id: string;
            status: string | null;
            total_amount: number | null;
            currency: string | null;
            created_at: string | null;
            shipping_address: Record<string, unknown> | null;
          }[]
        | null;
    }>;

    const orderIds = Array.from(
      new Set(
        payments
          .map((payment) => payment.commande_id)
          .filter((value): value is string => typeof value === "string" && value.length > 0),
      ),
    );

    const orderItemsByOrder = new Map<
      string,
      Array<{
        item_type: ItemType;
        label: string;
        quantity: number;
        total_price: number;
        product_type: "chimique" | "document" | "autre" | null;
        is_digital: boolean | null;
      }>
    >();

    if (orderIds.length > 0) {
      const { data: itemsRaw, error: itemsError } = await supabaseAdmin
        .from("commande_items")
        .select(
          `
            commande_id,
            item_type,
            quantity,
            total_price,
            produit:produits(name,type,is_digital),
            formation:formations(title),
            video:videos(title)
          `,
        )
        .in("commande_id", orderIds);

      if (itemsError) throw itemsError;

      (itemsRaw ?? []).forEach((rawItem) => {
        const orderId = rawItem.commande_id as string | null;
        if (!orderId) return;

        const itemType = normalizeItemType(rawItem.item_type);
        const produit = getSingleRelation(
          rawItem.produit as
            | { name: string | null; type: "chimique" | "document" | "autre" | null; is_digital: boolean | null }
            | {
                name: string | null;
                type: "chimique" | "document" | "autre" | null;
                is_digital: boolean | null;
              }[]
            | null,
        );

        const normalizedItem = {
          item_type: itemType,
          label: itemLabelFromRow({
            item_type: itemType,
            produit: rawItem.produit as any,
            formation: rawItem.formation as any,
            video: rawItem.video as any,
          }),
          quantity: Math.max(1, Number(rawItem.quantity || 1)),
          total_price: Number(rawItem.total_price || 0),
          product_type: produit?.type ?? null,
          is_digital: produit?.is_digital ?? null,
        };

        const bucket = orderItemsByOrder.get(orderId) ?? [];
        bucket.push(normalizedItem);
        orderItemsByOrder.set(orderId, bucket);
      });
    }

    const records: PaymentRecord[] = payments.map((payment) => {
      const order = getSingleRelation(payment.order);
      const customer = getSingleRelation(payment.customer);
      const shippingAddress =
        order?.shipping_address && typeof order.shipping_address === "object"
          ? (order.shipping_address as Record<string, unknown>)
          : null;
      const shippingEmail =
        shippingAddress && typeof shippingAddress.email === "string"
          ? shippingAddress.email
          : null;
      const metadataEmail =
        payment.metadata &&
        typeof payment.metadata === "object" &&
        typeof (payment.metadata as Record<string, unknown>).email === "string"
          ? ((payment.metadata as Record<string, unknown>).email as string)
          : null;
      const items = payment.commande_id
        ? (orderItemsByOrder.get(payment.commande_id) ?? [])
        : [];
      const itemTypes = Array.from(new Set(items.map((item) => item.item_type))) as ItemType[];

      return {
        id: payment.id,
        user_id: payment.user_id,
        commande_id: payment.commande_id,
        amount: Number(payment.amount || 0),
        provider: payment.provider === "paypal" ? "paypal" : "stripe",
        status: (payment.status ?? "pending") as PaymentRecord["status"],
        metadata:
          payment.metadata && typeof payment.metadata === "object"
            ? (payment.metadata as Record<string, unknown>)
            : null,
        created_at: payment.created_at,
        customer: {
          id: customer?.id ?? payment.user_id,
          full_name: customer?.full_name ?? null,
          email: shippingEmail ?? metadataEmail,
        },
        order: {
          id: order?.id ?? payment.commande_id,
          status: order?.status ?? null,
          total_amount:
            typeof order?.total_amount === "number" ? order.total_amount : null,
          currency: order?.currency ?? null,
          created_at: order?.created_at ?? null,
        },
        items,
        summary: {
          item_types: itemTypes,
          total_quantity: items.reduce((sum, item) => sum + item.quantity, 0),
          total_items_amount: items.reduce((sum, item) => sum + item.total_price, 0),
          contains_physical_product: items.some(
            (item) => item.item_type === "produit" && item.is_digital === false,
          ),
        },
      };
    });

    return NextResponse.json({
      data: records,
      meta: {
        total: records.length,
      },
    });
  } catch (error) {
    console.error("Paiements fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch paiements" },
      { status: 500 },
    );
  }
}
