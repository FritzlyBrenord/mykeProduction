function readEnv(name: string): string | undefined {
  const value = process.env[name];
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export const env = {
  NEXT_PUBLIC_SUPABASE_URL: readEnv("NEXT_PUBLIC_SUPABASE_URL"),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: readEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  SUPABASE_SERVICE_ROLE_KEY: readEnv("SUPABASE_SERVICE_ROLE_KEY"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: readEnv("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"),
  STRIPE_SECRET_KEY: readEnv("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: readEnv("STRIPE_WEBHOOK_SECRET"),
  NEXT_PUBLIC_PAYPAL_CLIENT_ID: readEnv("NEXT_PUBLIC_PAYPAL_CLIENT_ID"),
  PAYPAL_CLIENT_SECRET: readEnv("PAYPAL_CLIENT_SECRET"),
  UPSTASH_REDIS_REST_URL: readEnv("UPSTASH_REDIS_REST_URL"),
  UPSTASH_REDIS_REST_TOKEN: readEnv("UPSTASH_REDIS_REST_TOKEN"),
  INNGEST_EVENT_KEY: readEnv("INNGEST_EVENT_KEY"),
  INNGEST_SIGNING_KEY: readEnv("INNGEST_SIGNING_KEY"),
  NEXT_PUBLIC_SENTRY_DSN: readEnv("NEXT_PUBLIC_SENTRY_DSN"),
  RESEND_API_KEY: readEnv("RESEND_API_KEY"),
  EMAIL_FROM: readEnv("EMAIL_FROM"),
  ENCRYPTION_KEY: readEnv("ENCRYPTION_KEY"),
  NEXT_PUBLIC_APP_URL: readEnv("NEXT_PUBLIC_APP_URL"),
  NEXT_PUBLIC_APP_NAME: readEnv("NEXT_PUBLIC_APP_NAME") ?? "Myke Industrie",
} as const;

export function getPublicSupabaseEnv() {
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY");
  }

  return {
    url: env.NEXT_PUBLIC_SUPABASE_URL,
    anonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  };
}

export function getServiceRoleKey() {
  if (!env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
  }

  return env.SUPABASE_SERVICE_ROLE_KEY;
}

export function getEncryptionKeyHex() {
  if (!env.ENCRYPTION_KEY) {
    throw new Error("Missing ENCRYPTION_KEY");
  }

  return env.ENCRYPTION_KEY;
}
