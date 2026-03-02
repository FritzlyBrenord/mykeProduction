import { env } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERS_PAGE_SIZE = 200;
const USERS_MAX_PAGES = 50;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function isRateLimitedError(message: string) {
  const normalized = message.toLowerCase();
  return (
    normalized.includes("rate limit") ||
    normalized.includes("over_email_send_rate_limit")
  );
}

async function emailExistsInAuth(email: string) {
  const admin = createAdminClient();

  for (let page = 1; page <= USERS_MAX_PAGES; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({
      page,
      perPage: USERS_PAGE_SIZE,
    });

    if (error) {
      return { exists: false, error };
    }

    const users = data.users ?? [];
    const found = users.some((user) => normalizeEmail(user.email ?? "") === email);
    if (found) {
      return { exists: true, error: null };
    }

    if (users.length < USERS_PAGE_SIZE) {
      break;
    }
  }

  return { exists: false, error: null };
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Payload JSON invalide." }, { status: 400 });
  }

  const rawEmail =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).email
      : undefined;

  if (typeof rawEmail !== "string") {
    return NextResponse.json({ error: "Email requis." }, { status: 400 });
  }

  const email = normalizeEmail(rawEmail);
  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json({ error: "Format email invalide." }, { status: 400 });
  }

  const { exists, error: lookupError } = await emailExistsInAuth(email);
  if (lookupError) {
    console.error("Reset password lookup error:", lookupError);
    return NextResponse.json(
      { error: "Impossible de verifier cet email pour le moment." },
      { status: 500 },
    );
  }

  if (!exists) {
    return NextResponse.json(
      { error: "Aucun compte associe a cet email." },
      { status: 404 },
    );
  }

  const appBaseUrl = (env.NEXT_PUBLIC_APP_URL ?? request.nextUrl.origin).replace(/\/$/, "");
  const redirectTo = `${appBaseUrl}/auth/reset-password`;

  const admin = createAdminClient();
  const { error } = await admin.auth.resetPasswordForEmail(email, { redirectTo });

  if (error) {
    const status = isRateLimitedError(error.message || "") ? 429 : 500;
    return NextResponse.json(
      {
        error: isRateLimitedError(error.message || "")
          ? "Trop de demandes. Reessayez plus tard."
          : "Echec de l'envoi du lien de reinitialisation.",
      },
      { status },
    );
  }

  return NextResponse.json({ success: true });
}
