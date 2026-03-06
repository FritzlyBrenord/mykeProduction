import { finalizeStripePaymentSuccess, markStripePaymentFailed, markStripePaymentRefunded } from "@/lib/checkout/stripe-payment";
import { env } from "@/lib/env";
import { getStripeServerClient } from "@/lib/stripe/server";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getOrderIdFromPaymentIntent(paymentIntent: Stripe.PaymentIntent) {
  const metadata = paymentIntent.metadata ?? {};
  const orderId = typeof metadata.order_id === "string" ? metadata.order_id.trim() : "";
  return orderId.length > 0 ? orderId : null;
}

export async function POST(request: Request) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing STRIPE_WEBHOOK_SECRET" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  const payload = await request.text();
  const stripe = getStripeServerClient();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(payload, signature, env.STRIPE_WEBHOOK_SECRET);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Webhook signature verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = getOrderIdFromPaymentIntent(paymentIntent);
      if (orderId) {
        await finalizeStripePaymentSuccess({
          orderId,
          paymentIntent,
          source: "webhook",
        });
      }
    } else if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      const orderId = getOrderIdFromPaymentIntent(paymentIntent);
      if (orderId) {
        await markStripePaymentFailed({
          orderId,
          paymentIntent,
          source: "webhook",
        });
      }
    } else if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      if (typeof charge.payment_intent === "string" && charge.payment_intent) {
        const paymentIntent = await stripe.paymentIntents.retrieve(charge.payment_intent);
        const orderId = getOrderIdFromPaymentIntent(paymentIntent);
        if (orderId) {
          await markStripePaymentRefunded(orderId, paymentIntent);
        }
      }
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Stripe webhook handler error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
