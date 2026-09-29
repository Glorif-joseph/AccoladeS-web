import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Le site est maintenant protégé dans son ensemble : rien n'est visible
// sans être connecté, à l'exception des pages qui permettent justement de
// se connecter ou de créer un compte (impossible de les protéger aussi,
// sinon personne ne pourrait jamais se connecter).
const CHEMINS_PUBLICS = ["/connexion", "/inscription", "/bienvenue"];

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // IMPORTANT : ne pas retirer cet appel. Il rafraîchit le token si besoin
  // et garde la session synchronisée entre le navigateur et le serveur.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const chemin = request.nextUrl.pathname;
  const estPublic = CHEMINS_PUBLICS.some((c) => chemin.startsWith(c));

  if (!user && !estPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/connexion";
    url.searchParams.set("redirect", chemin);
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
