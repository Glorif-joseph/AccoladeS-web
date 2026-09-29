import { createBrowserClient } from "@supabase/ssr";

// Utilisé dans les Client Components ("use client").
// La session créée ici est la même que celle de l'app mobile :
// un compte créé sur le site fonctionne directement dans l'app, et inversement.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
