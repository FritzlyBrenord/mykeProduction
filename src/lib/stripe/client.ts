import { env } from "@/lib/env";
import { loadStripe } from "@stripe/stripe-js";

export const stripePromise = env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  ? loadStripe(env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY)
  : null;
