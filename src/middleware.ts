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

function isAdminFromMetadata(user: User | null) {
  if (!user) {
    return false;
  }

  const appRole = roleFromMetadata(user.app_metadata);
  return appRole === "admin";
}

async function getUserProfileAccess(
  user: User | null,
  supabase: ReturnType<typeof createServerClient>,
) {
  if (!user) {
    return { role: null as string | null, isActive: true };
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role,is_active,deleted_at")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return {
      role: isAdminFromMetadata(user) ? "admin" : null,
      isActive: true,
    };
  }

  const profileRole = typeof profile?.role === "string" ? profile.role : null;
  const effectiveRole =
    profileRole === "admin" || isAdminFromMetadata(user)
      ? "admin"
      : profileRole;

  return {
    role: effectiveRole,
    isActive:
      profile == null
        ? true
        : profile.is_active !== false && !profile.deleted_at,
  };
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

function redirectToLogin(
  request: NextRequest,
  options?: { includeNext?: boolean; blocked?: boolean },
) {
  const loginUrl = new URL("/auth/connexion", request.url);

  if (options?.includeNext) {
    loginUrl.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
  }

  if (options?.blocked) {
    loginUrl.searchParams.set("blocked", "1");
  }

  return NextResponse.redirect(loginUrl);
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isApiRoute = pathname.startsWith("/api/");
  const isAdminRoute = pathname.startsWith("/admin");
  const isApiAdminRoute = pathname.startsWith("/api/admin");
  const isAccountRoute = pathname.startsWith("/compte");
  const isCheckoutRoute = pathname.startsWith("/checkout");
  const isFormationLearningRoute = isLearningRoute(pathname);

  const requiresAuth =
    isAdminRoute ||
    isApiAdminRoute ||
    isAccountRoute ||
    isCheckoutRoute ||
    isFormationLearningRoute;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!requiresAuth) {
      return NextResponse.next();
    }

    if (isApiAdminRoute) {
      return NextResponse.json(
        { error: "Vous devez etre connecte.", code: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    if (isFormationLearningRoute) {
      return NextResponse.redirect(new URL(getFormationPath(pathname), request.url));
    }

    return redirectToLogin(request, { includeNext: true });
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
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (!requiresAuth) {
      return response;
    }

    if (isApiAdminRoute) {
      return NextResponse.json(
        { error: "Vous devez etre connecte.", code: "UNAUTHENTICATED" },
        { status: 401 },
      );
    }

    if (isFormationLearningRoute) {
      return NextResponse.redirect(new URL(getFormationPath(pathname), request.url));
    }

    return redirectToLogin(request, { includeNext: true });
  }

  const profileAccess = await getUserProfileAccess(user, supabase);
  const isAdminUser = profileAccess.role === "admin";

  if (!profileAccess.isActive) {
    if (isApiAdminRoute) {
      return NextResponse.json(
        {
          error: "Compte desactive. Contactez un administrateur.",
          code: "BLOCKED",
        },
        { status: 403 },
      );
    }

    return redirectToLogin(request, { blocked: true });
  }

  if (isAdminUser && !isApiRoute && !isAdminRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  if (!requiresAuth) {
    return response;
  }

  if (isAdminRoute || isApiAdminRoute) {
    if (!isAdminUser) {
      if (isApiAdminRoute) {
        return NextResponse.json(
          { error: "Acces admin refuse.", code: "FORBIDDEN" },
          { status: 403 },
        );
      }

      return NextResponse.redirect(new URL("/", request.url));
    }
  }

  if (isFormationLearningRoute) {
    const slug = pathname.split("/")[2];

    if (slug) {
      const { data: formation, error: formationError } = await supabase
        .from("formations")
        .select("id,status,is_free,deleted_at")
        .eq("slug", slug)
        .maybeSingle();

      if (
        formationError ||
        !formation ||
        formation.status !== "published" ||
        formation.deleted_at
      ) {
        return NextResponse.redirect(new URL(`/formations/${slug}`, request.url));
      }

      const { data: enrollment, error: enrollmentError } = await supabase
        .from("enrollments")
        .select("id")
        .eq("user_id", user.id)
        .eq("formation_id", formation.id)
        .maybeSingle();

      if (enrollmentError && enrollmentError.code !== "PGRST116") {
        return NextResponse.redirect(new URL(`/formations/${slug}`, request.url));
      }

      if (!enrollment && !formation.is_free) {
        return NextResponse.redirect(new URL(`/formations/${slug}`, request.url));
      }

      // Best effort auto-enrollment for free formations to keep access and progress in sync.
      if (!enrollment && formation.is_free) {
        await supabase.from("enrollments").upsert(
          {
            user_id: user.id,
            formation_id: formation.id,
            progress: 0,
          },
          { onConflict: "user_id,formation_id" },
        );
      }
    }

    return response;
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!api/|_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)",
    "/admin/:path*",
    "/api/admin/:path*",
  ],
};
