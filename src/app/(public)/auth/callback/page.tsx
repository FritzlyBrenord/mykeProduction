"use client";

import { createClient } from "@/lib/supabase/client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

type ProfileGateRow = {
  role: "admin" | "client" | null;
  is_active: boolean | null;
  deleted_at: string | null;
};

const TRANSIENT_OAUTH_COOKIE_PATTERNS = [
  "supabase-auth-code-verifier",
  "sb-auth-code-verifier",
  "myke-auth-token-code-verifier",
  "supabase.auth.codeVerifier",
  "sb-myke-auth-token-code-verifier",
  "supabase.auth.pkce",
  "pkce-verifier",
] as const;

function clearTransientOAuthCookies() {
  const cookies = document.cookie.split(";").map((entry) => entry.trim());

  cookies.forEach((cookie) => {
    const [name] = cookie.split("=");
    if (!name) return;

    const shouldClear = TRANSIENT_OAUTH_COOKIE_PATTERNS.some((pattern) =>
      name.includes(pattern),
    );

    if (!shouldClear) return;

    document.cookie = `${name}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  });
}

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      const supabase = createClient();
      const profiles = () => supabase.from("profiles" as any) as any;

      try {
        const url = new URL(window.location.href);
        const code = url.searchParams.get("code");
        const oauthError = url.searchParams.get("error");
        const errorDescription = url.searchParams.get("error_description");
        let user = (await supabase.auth.getUser()).data.user ?? null;

        if (oauthError) {
          toast.error(`Erreur OAuth: ${errorDescription || oauthError}`);
          router.replace("/auth/connexion");
          return;
        }

        if (!code && !user) {
          toast.error("Code OAuth manquant.");
          router.replace("/auth/connexion");
          return;
        }

        if (code) {
          const { data, error } = await supabase.auth.exchangeCodeForSession(code);

          if (error) {
            const fallbackUser = (await supabase.auth.getUser()).data.user ?? null;
            const isMissingPkceVerifier = error.message
              .toLowerCase()
              .includes("pkce code verifier not found");

            // If session already exists (common with auto session handling), continue silently.
            if (isMissingPkceVerifier && fallbackUser) {
              user = fallbackUser;
            } else {
              toast.error(`Echec d'authentification Google: ${error.message}`);
              router.replace("/auth/connexion");
              return;
            }
          } else {
            const fallbackUser = (await supabase.auth.getUser()).data.user ?? null;
            user = data.session?.user ?? fallbackUser ?? user;
          }
        }

        if (!user) {
          toast.error("Session Google introuvable.");
          router.replace("/auth/connexion");
          return;
        }

        const fullName =
          user.user_metadata?.full_name ||
          user.user_metadata?.name ||
          user.email?.split("@")[0] ||
          null;
        const avatarUrl =
          user.user_metadata?.avatar_url || user.user_metadata?.picture || null;

        // Best-effort profile sync: do not block login if this fails.
        const { error: profileError } = await profiles().upsert(
          {
            id: user.id,
            full_name: fullName,
            avatar_url: avatarUrl,
          },
          { onConflict: "id" },
        );

        if (profileError) {
          console.error("Profile sync warning after Google OAuth:", profileError);
        }

        const { error: loginUpdateError } = await profiles()
          .update({ last_login_at: new Date().toISOString() })
          .eq("id", user.id);

        if (loginUpdateError) {
          console.error("Unable to update last_login_at:", loginUpdateError);
        }

        const { data: profile } = (await profiles()
          .select("role,is_active,deleted_at")
          .eq("id", user.id)
          .maybeSingle()) as { data: ProfileGateRow | null };

        if (profile && (profile.is_active === false || Boolean(profile.deleted_at))) {
          await supabase.auth.signOut();
          toast.error("Compte desactive. Contactez un administrateur.");
          router.replace("/auth/connexion?blocked=1");
          return;
        }

        const metadataRole =
          (user.app_metadata?.role as "admin" | "client" | undefined) ??
          (user.user_metadata?.role as "admin" | "client" | undefined);
        const role =
          profile?.role === "admin" || metadataRole === "admin" ? "admin" : "client";

        toast.success("Connexion Google reussie.");
        router.replace(role === "admin" ? "/admin/dashboard" : "/");
      } catch (error) {
        console.error("OAuth callback exception:", error);
        toast.error("Une erreur est survenue pendant la connexion Google.");
        router.replace("/auth/connexion");
      } finally {
        clearTransientOAuthCookies();
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <div className="text-center">
        <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-600">Connexion Google en cours...</p>
        <p className="text-xs text-slate-400 mt-2">Veuillez patienter</p>
      </div>
    </div>
  );
}
