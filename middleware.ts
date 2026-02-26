import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";

function roleFromMetadata(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }

  const role = (metadata as Record<string, unknown>).role;
  return typeof role === "string" ? role : null;
}

function isAdminUser(user: User | null) {
  if (!user) {
    return false;
  }

  const appRole = roleFromMetadata(user.app_metadata);
  const userRole = roleFromMetadata(user.user_metadata);
  return appRole === "admin" || userRole === "admin";
}

function isLearningRoute(pathname: string) {
  return /^\/formations\/[^/]+\/apprendre(?:\/|$)/.test(pathname);
}

function getFormationPath(pathname: string) {
  const parts = pathname.split("/").filter(Boolean);
  if (parts.length >= 3 && parts[0] === "formations") {
    return `/formations/${parts[1]}`;
  }

  return "/formations";
}

function redirectToLogin(request: NextRequest) {
  return NextResponse.redirect(new URL("/auth/connexion", request.url));
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isApiAdminRoute = pathname.startsWith("/api/admin");
  const isAccountRoute = pathname.startsWith("/compte");
  const isCheckoutRoute = pathname.startsWith("/checkout");
  const isCartRoute = pathname === "/boutique/panier";
  const isFormationLearningRoute = isLearningRoute(pathname);

  const requiresAuth =
    isAdminRoute ||
    isApiAdminRoute ||
    isAccountRoute ||
    isCheckoutRoute ||
    isCartRoute ||
    isFormationLearningRoute;

  if (!requiresAuth) {
    return NextResponse.next();
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (isApiAdminRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isFormationLearningRoute) {
      return NextResponse.redirect(new URL(getFormationPath(pathname), request.url));
    }

    return redirectToLogin(request);
  }

  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isApiAdminRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isFormationLearningRoute) {
      return NextResponse.redirect(new URL(getFormationPath(pathname), request.url));
    }

    return redirectToLogin(request);
  }

  if (isAdminRoute || isApiAdminRoute) {
    if (!isAdminUser(user)) {
      if (isApiAdminRoute) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      return redirectToLogin(request);
    }

    if (isAdminRoute) {
      const twoFaVerified = request.cookies.get("2fa_verified")?.value === "true";
      if (!twoFaVerified) {
        return redirectToLogin(request);
      }
    }
  }

  if (isFormationLearningRoute) {
    // Enrollment checks are implemented in phase 2 with DB queries.
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
