import { env } from "@/lib/env";
import Stripe from "stripe";

let stripeClient: Stripe | null = null;

export function getStripeServerClient() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new Error("Missing STRIPE_SECRET_KEY");
  }

  if (stripeClient) {
    return stripeClient;
  }

  stripeClient = new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: {
      name: "myke-industrie",
      version: "1.0.0",
    },
  });

  return stripeClient;
}

export function toStripeAmount(amount: number) {
  return Math.round(Math.max(0, Number(amount || 0)) * 100);
}
