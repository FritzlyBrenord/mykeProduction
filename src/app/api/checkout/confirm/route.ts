import { finalizeStripePaymentSuccess, markStripePaymentFailed } from "@/lib/checkout/stripe-payment";
import { getStripeServerClient } from "@/lib/stripe/server";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

function normalizeText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, maxLength);
}

function parseBody(payload: unknown) {
  const record = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
  const orderId = normalizeText(record.orderId ?? record.order_id, 100);
  const paymentIntentId = normalizeText(record.paymentIntentId ?? record.payment_intent_id, 120);
  return { orderId, paymentIntentId };
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 });
    }

    const { orderId, paymentIntentId } = parseBody(body);
    if (!orderId || !paymentIntentId) {
      return NextResponse.json(
        { error: "orderId et paymentIntentId sont requis." },
        { status: 400 },
      );
    }

    const stripe = getStripeServerClient();
    const paymentIntent = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = paymentIntent.metadata ?? {};
    const orderIdFromMetadata = typeof metadata.order_id === "string" ? metadata.order_id : "";
    const userIdFromMetadata = typeof metadata.user_id === "string" ? metadata.user_id : "";

    if (!orderIdFromMetadata || orderIdFromMetadata !== orderId) {
      return NextResponse.json({ error: "Paiement incoherent avec la commande." }, { status: 409 });
    }

    if (userIdFromMetadata && userIdFromMetadata !== user.id) {
      return NextResponse.json({ error: "Paiement non autorise." }, { status: 403 });
    }

    if (paymentIntent.status === "succeeded") {
      const finalized = await finalizeStripePaymentSuccess({
        orderId,
        paymentIntent,
        source: "confirm",
        expectedUserId: user.id,
      });

      if (!finalized.ok) {
        const status = finalized.error === "ORDER_FORBIDDEN" ? 403 : 409;
        return NextResponse.json({ error: finalized.error }, { status });
      }

      return NextResponse.json({
        status: "paid",
        orderId: finalized.orderId,
        paymentId: finalized.paymentId,
      });
    }

    if (
      paymentIntent.status === "requires_payment_method" ||
      paymentIntent.status === "canceled"
    ) {
      await markStripePaymentFailed({
        orderId,
        paymentIntent,
        source: "confirm",
      });
      return NextResponse.json(
        {
          status: "failed",
          error: "Paiement echoue. Verifiez votre moyen de paiement.",
        },
        { status: 409 },
      );
    }

    return NextResponse.json({
      status: "pending",
      paymentIntentStatus: paymentIntent.status,
    });
  } catch (error) {
    console.error("Checkout confirm error:", error);
    return NextResponse.json(
      { error: "Impossible de confirmer le paiement pour le moment." },
      { status: 500 },
    );
  }
}
