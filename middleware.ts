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
  const userRole = roleFromMetadata(user.user_metadata);
  return appRole === "admin" || userRole === "admin";
}

async function isAdminUser(
  user: User | null,
  supabase: ReturnType<typeof createServerClient>,
) {
  if (!user) {
    return false;
  }

  if (isAdminFromMetadata(user)) {
    return true;
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (error) {
    return false;
  }

  return profile?.role === "admin";
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

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    if (!requiresAuth) {
      return NextResponse.next();
    }

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
        const allCookies = request.cookies.getAll();
        console.log(`Middleware - Cookies bruts:`, allCookies.map(c => ({ name: c.name, length: c.value.length })));
        
        // Filtrer SEULEMENT les cookies problématiques OAuth, mais GARDER les cookies de session Supabase
        const problematicPatterns = [
            'supabase-auth-code-verifier',
            'sb-auth-code-verifier',
            'myke-auth-token-code-verifier',
            'supabase.auth.codeVerifier'
          ];
          
        const filteredCookies = allCookies.filter(cookie => {
          // Garder tous les cookies de session Supabase légitimes
          if (cookie.name.startsWith('sb-') || cookie.name.startsWith('supabase.')) {
            // Ne filtrer que les cookies de code verifier problématiques
            return !problematicPatterns.some(pattern => cookie.name.includes(pattern));
          }
          
          // Filtrer les autres cookies problématiques
          const isProblematic = problematicPatterns.some(pattern => 
            cookie.name.includes(pattern) || 
            cookie.value.length > 1000
          );
          
          if (isProblematic) {
            console.log(`Middleware - Cookie filtré: ${cookie.name} (${cookie.value.length} chars)`);
          }
          
          return !isProblematic;
        });
        
        console.log(`Middleware: ${filteredCookies.length}/${allCookies.length} cookies valides`);
        console.log(`Middleware - Cookies valides:`, filteredCookies.map(c => ({ name: c.name, length: c.value.length })));
        return filteredCookies;
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

  // Always run auth check so Supabase can refresh session cookies on every request.
  console.log(`Middleware - Route: ${pathname}, RequiresAuth: ${requiresAuth}`);
  const {
    data: { user },
  } = await supabase.auth.getUser();
  
  console.log(`Middleware - User authenticated: ${!!user}, User ID: ${user?.id}`);

  if (!requiresAuth) {
    return response;
  }

  if (!user) {
    console.log(`Middleware - No user found, redirecting...`);
    if (isApiAdminRoute) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isFormationLearningRoute) {
      return NextResponse.redirect(new URL(getFormationPath(pathname), request.url));
    }

    return redirectToLogin(request);
  }

  if (isAdminRoute || isApiAdminRoute) {
    const admin = await isAdminUser(user, supabase);
    if (!admin) {
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
    // Vérifier si l'utilisateur est inscrit à la formation
    console.log(`Middleware - Checking enrollment for learning route`);
    const slug = pathname.split('/')[2]; // Extraire le slug de /formations/[slug]/apprendre
    
    if (slug) {
      console.log(`Middleware - Checking enrollment for slug: ${slug}, user: ${user.id}`);
      const { data: enrollment, error: enrollmentError } = await supabase
        .from('enrollments')
        .select(`
          *,
          formation:formations(id, slug, status)
        `)
        .eq('user_id', user.id)
        .eq('formation.slug', slug)
        .single();
      
      console.log(`Middleware - Enrollment check result:`, { 
        found: !!enrollment, 
        error: enrollmentError?.message,
        formationStatus: enrollment?.formation?.status 
      });
      
      // Si non inscrit ou formation non publiée, rediriger vers la page de la formation
      if (enrollmentError || !enrollment || !enrollment.formation || enrollment.formation.status !== 'published') {
        console.log(`Middleware - Enrollment check failed, redirecting to formation page`);
        return NextResponse.redirect(new URL(`/formations/${slug}`, request.url));
      }
    }
    
    return response;
  }

  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
