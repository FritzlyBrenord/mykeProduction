import { getPublicSupabaseEnv } from "@/lib/env";
import type { Database } from "@/types/database.types";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export async function createClient() {
  const cookieStore = await cookies();
  const { url, anonKey } = getPublicSupabaseEnv();

  return createServerClient<Database>(url, anonKey, {
    cookies: {
      getAll() {
        const allCookies = cookieStore.getAll();
        
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
          return !problematicPatterns.some(pattern => 
            cookie.name.includes(pattern) || 
            cookie.value.length > 1000
          );
        });
        
        console.log(`Server Supabase: ${filteredCookies.length}/${allCookies.length} cookies valides`);
        return filteredCookies;
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server Components cannot always set cookies.
        }
      },
    },
  });
}
