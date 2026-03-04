import { Providers } from "@/components/providers";
import { AuthProvider } from "@/lib/hooks/useAuth";
import { CartProvider } from "@/lib/hooks/useCart";
import { createClient } from "@/lib/supabase/server";
import type { User } from "@/lib/types";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import VisitorTracker from "@/components/analytics/VisitorTracker";
import { Toaster } from "sonner";
import { Suspense } from "react";

function roleFromMetadata(metadata: unknown): "client" | "admin" {
  if (!metadata || typeof metadata !== "object") return "client";
  const role = (metadata as Record<string, unknown>).role;
  return role === "admin" ? "admin" : "client";
}

async function getInitialUser(): Promise<User | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
      error,
    } = await supabase.auth.getUser();

    if (error || !authUser) return null;

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", authUser.id)
      .maybeSingle();

    if (profile) {
      const profileWithOptionalFields = profile as {
        phone_encrypted?: string | null;
        country?: string | null;
        bio?: string | null;
      };

      return {
        ...(profile as User),
        email: authUser.email ?? "",
        phone: profileWithOptionalFields.phone_encrypted ?? null,
        country: profileWithOptionalFields.country ?? null,
        bio: profileWithOptionalFields.bio ?? null,
      } as User;
    }

    return {
      id: authUser.id,
      email: authUser.email ?? "",
      full_name:
        (authUser.user_metadata?.full_name as string | undefined) ?? null,
      avatar_url:
        (authUser.user_metadata?.avatar_url as string | undefined) ?? null,
      role: roleFromMetadata(authUser.app_metadata),
      phone: null,
      country: null,
      bio: null,
      is_active: true,
      two_fa_enabled: false,
      created_at: authUser.created_at ?? new Date().toISOString(),
    } as User;
  } catch {
    return null;
  }
}

export default async function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialUser = await getInitialUser();

  return (
    <div className="min-h-screen flex flex-col">
      <AuthProvider initialUser={initialUser}>
        <CartProvider>
          <Providers>
            <Suspense fallback={null}>
              <VisitorTracker />
            </Suspense>
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
            <Toaster position="top-right" richColors />
          </Providers>
        </CartProvider>
      </AuthProvider>
    </div>
  );
}
