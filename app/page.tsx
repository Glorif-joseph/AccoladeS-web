import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Reprend le rôle de app/index.tsx côté app mobile : ce n'est pas un écran
// en soi, juste le point d'entrée qui décide où aller. Le vrai écran
// affiché aux visiteurs déconnectés est /connexion (components/AuthScreen.tsx,
// déjà identique à index.tsx) ; le middleware y redirige de toute façon tout
// visiteur non connecté avant même d'atteindre cette page. Ce fichier ne
// gère donc que le cas d'un membre déjà connecté qui atterrit sur "/" (ex. en
// cliquant le logo) : direction /produits, l'écran d'accueil réel de l'app
// (Tabs initialRouteName="produits").
export default async function Index() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  redirect(user ? "/produits" : "/connexion");
}
