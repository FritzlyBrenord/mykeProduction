import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
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
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const confirmation =
    typeof body === "object" && body !== null
      ? (body as Record<string, unknown>).confirmation
      : null;

  if (confirmation !== "SUPPRIMER") {
    return NextResponse.json(
      { error: "Confirmation invalide. Tapez SUPPRIMER." },
      { status: 400 },
    );
  }

  const admin = createAdminClient();
  if (!admin) {
    return NextResponse.json(
      { error: "Service unavailable" },
      { status: 500 },
    );
  }
  const { error: deleteError } = await admin.auth.admin.deleteUser(user.id);

  if (deleteError) {
    return NextResponse.json(
      { error: "Impossible de supprimer le compte." },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
