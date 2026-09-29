import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

// Utilisé dans les Server Components, Server Actions et Route Handlers.
// Lit/écrit la session via les cookies — c'est ce qui permet à une page
// rendue côté serveur de savoir "qui est connecté" avant même l'hydratation.
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Appelé depuis un Server Component : sans effet, le
            // middleware se charge déjà de rafraîchir la session.
          }
        },
      },
    }
  );
}
