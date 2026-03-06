import { sendOrderCreatedEmail } from "@/lib/email/orders";
import { appendTrackingEvent } from "@/lib/orders/tracking";
import { supabaseAdmin } from "@/lib/supabase-admin";
import type Stripe from "stripe";

type ItemType = "produit" | "formation" | "video";

interface FinalizeStripePaymentInput {
  orderId: string;
  paymentIntent: Stripe.PaymentIntent;
  source: "webhook" | "confirm";
  expectedUserId?: string;
}

interface MarkStripeFailureInput {
  orderId: string;
  paymentIntent: Stripe.PaymentIntent;
  source: "webhook" | "confirm";
}

function asRecord(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
}

function asString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function getSingleRelation<T>(relation: T | T[] | null | undefined): T | null {
  if (Array.isArray(relation)) return relation[0] ?? null;
  return relation ?? null;
}

function itemNameFromRow(
  item: {
    item_type: ItemType;
    produit?: { name?: string | null } | { name?: string | null }[] | null;
    formation?: { title?: string | null } | { title?: string | null }[] | null;
    video?: { title?: string | null } | { title?: string | null }[] | null;
  },
) {
  if (item.item_type === "produit") {
    return getSingleRelation(item.produit)?.name ?? "Produit";
  }
  if (item.item_type === "formation") {
    return getSingleRelation(item.formation)?.title ?? "Formation";
  }
  return getSingleRelation(item.video)?.title ?? "Video";
}

function buildItemWorkflow(
  item: {
    item_type: ItemType;
    produit?: { is_digital?: boolean | null } | { is_digital?: boolean | null }[] | null;
    tracking_timeline?: unknown;
  },
  nowIso: string,
) {
  const paidTimeline = appendTrackingEvent(item.tracking_timeline ?? [], {
    status: "paid",
    at: nowIso,
    label: "Paiement Stripe confirme",
  });

  if (item.item_type === "formation") {
    return {
      item_status: "paid",
      authorized_at: null,
      processing_at: null,
      shipped_at: null,
      delivered_at: null,
      cancelled_at: null,
      tracking_timeline: appendTrackingEvent(paidTimeline, {
        status: "paid",
        at: nowIso,
        label: "En attente d autorisation formation",
      }),
      updated_at: nowIso,
    };
  }

  if (
    item.item_type === "video" ||
    (item.item_type === "produit" && Boolean(getSingleRelation(item.produit)?.is_digital))
  ) {
    return {
      item_status: "delivered",
      authorized_at: null,
      processing_at: null,
      shipped_at: null,
      delivered_at: nowIso,
      cancelled_at: null,
      tracking_timeline: appendTrackingEvent(paidTimeline, {
        status: "delivered",
        at: nowIso,
        label: "Livre automatiquement (numerique)",
      }),
      updated_at: nowIso,
    };
  }

  return {
    item_status: "paid",
    authorized_at: null,
    processing_at: null,
    shipped_at: null,
    delivered_at: null,
    cancelled_at: null,
    tracking_timeline: paidTimeline,
    updated_at: nowIso,
  };
}

function toPositiveInteger(value: unknown, fallback = 1) {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return fallback;
  return Math.max(1, Math.floor(numeric));
}

async function resolvePaymentRow(orderId: string, paymentRowIdFromMetadata: string | null) {
  if (paymentRowIdFromMetadata) {
    const { data: paymentById } = await (supabaseAdmin
      .from("paiements") as any)
      .select("*")
      .eq("id", paymentRowIdFromMetadata)
      .maybeSingle();

    if (paymentById) {
      return paymentById as any;
    }
  }

  const { data: paymentRows } = await (supabaseAdmin
    .from("paiements") as any)
    .select("*")
    .eq("commande_id", orderId)
    .eq("provider", "stripe")
    .order("created_at", { ascending: false })
    .limit(1);

  return ((paymentRows ?? [])[0] ?? null) as any;
}

async function clearUserCart(userId: string) {
  const { data: carts } = await supabaseAdmin
    .from("carts")
    .select("id,created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(10);

  const cartId = (carts ?? [])[0]?.id ?? null;
  if (!cartId) {
    return;
  }

  const { error } = await supabaseAdmin
    .from("cart_items")
    .delete()
    .eq("cart_id", cartId);

  if (error) {
    console.error("Cart clear warning after Stripe payment:", error);
  }
}

export async function finalizeStripePaymentSuccess({
  orderId,
  paymentIntent,
  source,
  expectedUserId,
}: FinalizeStripePaymentInput) {
  const nowIso = new Date().toISOString();
  const metadata = asRecord(paymentIntent.metadata);
  const paymentRowId = asString(metadata.payment_row_id);

  const { data: order } = await (supabaseAdmin
    .from("commandes") as any)
    .select("*")
    .eq("id", orderId)
    .maybeSingle();

  if (!order) {
    return { ok: false as const, error: "ORDER_NOT_FOUND" };
  }

  if (expectedUserId && order.user_id !== expectedUserId) {
    return { ok: false as const, error: "ORDER_FORBIDDEN" };
  }

  const payment = await resolvePaymentRow(orderId, paymentRowId);
  if (!payment) {
    return { ok: false as const, error: "PAYMENT_ROW_NOT_FOUND" };
  }

  const paymentMetadata = asRecord(payment.metadata);
  const emailAlreadySent = Boolean(paymentMetadata.email_sent_at);
  const stockAlreadyReduced = Boolean(paymentMetadata.stock_reduced_at);
  const isAlreadyPaid = payment.status === "success" && order.status !== "pending";

  if (isAlreadyPaid && stockAlreadyReduced && emailAlreadySent) {
    return {
      ok: true as const,
      status: "already_paid" as const,
      orderId: order.id as string,
      paymentId: payment.id as string,
    };
  }

  const stripePaymentMetadata: Record<string, unknown> = {
    ...paymentMetadata,
    stripe_payment_intent_id: paymentIntent.id,
    stripe_payment_intent_status: paymentIntent.status,
    stripe_latest_event_source: source,
    stripe_amount_received: Number(paymentIntent.amount_received || 0) / 100,
    stripe_last_synced_at: nowIso,
  };
  let latestPaymentMetadata: Record<string, unknown> = stripePaymentMetadata;

  const { error: paymentUpdateError } = await (supabaseAdmin
    .from("paiements") as any)
    .update({
      status: "success",
      metadata: stripePaymentMetadata,
    })
    .eq("id", payment.id);

  if (paymentUpdateError) {
    console.error("Stripe payment update error:", paymentUpdateError);
  }

  if (!isAlreadyPaid) {
    const nextOrderTimeline = appendTrackingEvent(order.tracking_timeline ?? [], {
      status: "paid",
      at: nowIso,
      label: "Paiement Stripe confirme",
    });

    const { error: orderUpdateError } = await (supabaseAdmin
      .from("commandes") as any)
      .update({
        status: "paid",
        payment_method: "stripe",
        payment_id: payment.id,
        tracking_timeline: nextOrderTimeline,
        updated_at: nowIso,
      })
      .eq("id", order.id);

    if (orderUpdateError) {
      console.error("Order status update error:", orderUpdateError);
    }
  }

  const { data: orderItems } = await (supabaseAdmin
    .from("commande_items") as any)
    .select(`
      id,
      item_type,
      produit_id,
      quantity,
      unit_price,
      total_price,
      tracking_timeline,
      produit:produits(name,is_digital),
      formation:formations(title),
      video:videos(title)
    `)
    .eq("commande_id", order.id);

  const itemRows = (orderItems ?? []) as Array<{
    id: string;
    item_type: ItemType;
    produit_id: string | null;
    quantity: number;
    unit_price: number;
    total_price: number;
    tracking_timeline: unknown;
    produit?: { name?: string | null; is_digital?: boolean | null } | { name?: string | null; is_digital?: boolean | null }[] | null;
    formation?: { title?: string | null } | { title?: string | null }[] | null;
    video?: { title?: string | null } | { title?: string | null }[] | null;
  }>;

  if (!isAlreadyPaid) {
    await Promise.all(
      itemRows.map(async (item) => {
        const workflow = buildItemWorkflow(item, nowIso);
        const { error } = await (supabaseAdmin
          .from("commande_items") as any)
          .update(workflow)
          .eq("id", item.id);

        if (error) {
          console.error("Order item workflow update error:", error);
        }
      }),
    );
  }

  if (!stockAlreadyReduced) {
    const productQuantities = new Map<string, number>();

    for (const item of itemRows) {
      if (item.item_type !== "produit" || !item.produit_id) {
        continue;
      }

      if (Boolean(getSingleRelation(item.produit)?.is_digital)) {
        continue;
      }

      const nextQty =
        (productQuantities.get(item.produit_id) ?? 0) + toPositiveInteger(item.quantity, 1);
      productQuantities.set(item.produit_id, nextQty);
    }

    let stockReductionFailed = false;

    for (const [produitId, orderedQuantity] of productQuantities.entries()) {
      const { data: product, error: productLoadError } = await (supabaseAdmin
        .from("produits") as any)
        .select("id,stock")
        .eq("id", produitId)
        .maybeSingle();

      if (productLoadError || !product) {
        stockReductionFailed = true;
        console.error("Product stock load error:", productLoadError ?? "PRODUCT_NOT_FOUND");
        continue;
      }

      if (typeof product.stock !== "number") {
        continue;
      }

      const currentStock = Math.max(0, Math.floor(product.stock));
      const newStock = Math.max(0, currentStock - toPositiveInteger(orderedQuantity, 1));

      const { error: stockUpdateError } = await (supabaseAdmin
        .from("produits") as any)
        .update({
          stock: newStock,
          updated_at: nowIso,
        })
        .eq("id", produitId);

      if (stockUpdateError) {
        stockReductionFailed = true;
        console.error("Product stock update error:", stockUpdateError);
      }
    }

    if (!stockReductionFailed) {
      latestPaymentMetadata = {
        ...latestPaymentMetadata,
        stock_reduced_at: nowIso,
      };

      const { error: stockMarkerError } = await (supabaseAdmin
        .from("paiements") as any)
        .update({
          metadata: latestPaymentMetadata,
        })
        .eq("id", payment.id);

      if (stockMarkerError) {
        console.error("Payment metadata stock marker warning:", stockMarkerError);
      }
    }
  }

  await clearUserCart(order.user_id as string);

  if (!emailAlreadySent) {
    const shipping = asRecord(order.shipping_address);
    const shippingEmail = asString(shipping.email);
    const fallbackName = asString(shipping.first_name) || "Client";
    const fullName =
      `${asString(shipping.first_name) ?? ""} ${asString(shipping.last_name) ?? ""}`.trim() ||
      fallbackName;

    if (shippingEmail) {
      try {
        await sendOrderCreatedEmail({
          to: shippingEmail,
          customerName: fullName,
          orderId: order.id as string,
          totalAmount: Number(order.total_amount || 0),
          currency: (order.currency as string) || "USD",
          items: itemRows.map((item) => ({
            itemName: itemNameFromRow(item),
            quantity: Math.max(1, Number(item.quantity || 1)),
            totalPrice:
              Number(item.total_price || 0) ||
              Number(item.unit_price || 0) * Math.max(1, Number(item.quantity || 1)),
          })),
        });

        const { error: paymentEmailMetadataError } = await (supabaseAdmin
          .from("paiements") as any)
          .update({
            metadata: {
              ...latestPaymentMetadata,
              email_sent_at: nowIso,
            },
          })
          .eq("id", payment.id);

        if (paymentEmailMetadataError) {
          console.error("Payment metadata email marker warning:", paymentEmailMetadataError);
        }
      } catch (emailError) {
        console.error("Order confirmation email warning:", emailError);
      }
    }
  }

  const { error: auditError } = await (supabaseAdmin.from("audit_logs") as any).insert({
    user_id: order.user_id,
    action: "payment",
    table_name: "paiements",
    record_id: payment.id,
    new_data: {
      order_id: order.id,
      provider: "stripe",
      payment_intent_id: paymentIntent.id,
      source,
      status: "success",
    },
  });

  if (auditError) {
    console.error("Payment audit log warning:", auditError);
  }

  return {
    ok: true as const,
    status: "paid" as const,
    orderId: order.id as string,
    paymentId: payment.id as string,
  };
}

export async function markStripePaymentFailed({
  orderId,
  paymentIntent,
  source,
}: MarkStripeFailureInput) {
  const nowIso = new Date().toISOString();
  const metadata = asRecord(paymentIntent.metadata);
  const paymentRowId = asString(metadata.payment_row_id);
  const payment = await resolvePaymentRow(orderId, paymentRowId);

  if (!payment) {
    return { ok: false as const, error: "PAYMENT_ROW_NOT_FOUND" };
  }

  const paymentMetadata = asRecord(payment.metadata);
  const failureCode = asString(paymentIntent.last_payment_error?.code) || null;
  const failureMessage = asString(paymentIntent.last_payment_error?.message) || null;

  const { error: paymentUpdateError } = await (supabaseAdmin
    .from("paiements") as any)
    .update({
      status: "failed",
      metadata: {
        ...paymentMetadata,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_intent_status: paymentIntent.status,
        stripe_last_error_code: failureCode,
        stripe_last_error_message: failureMessage,
        stripe_latest_event_source: source,
        stripe_last_synced_at: nowIso,
      },
    })
    .eq("id", payment.id);

  if (paymentUpdateError) {
    console.error("Stripe failed payment update error:", paymentUpdateError);
  }

  return { ok: true as const, status: "failed" as const, paymentId: payment.id as string };
}

export async function markStripePaymentRefunded(orderId: string, paymentIntent: Stripe.PaymentIntent) {
  const nowIso = new Date().toISOString();
  const metadata = asRecord(paymentIntent.metadata);
  const paymentRowId = asString(metadata.payment_row_id);
  const payment = await resolvePaymentRow(orderId, paymentRowId);

  if (!payment) {
    return { ok: false as const, error: "PAYMENT_ROW_NOT_FOUND" };
  }

  const paymentMetadata = asRecord(payment.metadata);

  const { error: paymentUpdateError } = await (supabaseAdmin
    .from("paiements") as any)
    .update({
      status: "refunded",
      metadata: {
        ...paymentMetadata,
        stripe_payment_intent_id: paymentIntent.id,
        stripe_payment_intent_status: paymentIntent.status,
        stripe_last_synced_at: nowIso,
      },
    })
    .eq("id", payment.id);

  if (paymentUpdateError) {
    console.error("Stripe refund payment update warning:", paymentUpdateError);
  }

  const { data: order } = await (supabaseAdmin
    .from("commandes") as any)
    .select("id,tracking_timeline")
    .eq("id", orderId)
    .maybeSingle();

  if (order) {
    const nextTimeline = appendTrackingEvent(order.tracking_timeline ?? [], {
      status: "refunded",
      at: nowIso,
      label: "Paiement rembourse",
    });

    const { error: orderUpdateError } = await (supabaseAdmin
      .from("commandes") as any)
      .update({
        status: "refunded",
        tracking_timeline: nextTimeline,
        cancelled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("id", orderId);

    if (orderUpdateError) {
      console.error("Order refunded update warning:", orderUpdateError);
    }

    const { error: itemUpdateError } = await (supabaseAdmin
      .from("commande_items") as any)
      .update({
        item_status: "refunded",
        cancelled_at: nowIso,
        updated_at: nowIso,
      })
      .eq("commande_id", orderId);

    if (itemUpdateError) {
      console.error("Order items refunded update warning:", itemUpdateError);
    }
  }

  return { ok: true as const, status: "refunded" as const };
}
