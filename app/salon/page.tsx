import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SalonChat from "@/components/SalonChat";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function Salon() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Lecture publique confirmée par la policy RLS ("Tout le monde peut
  // lire le salon", SELECT true) : ça fonctionne même sans session.
  const { data: messages } = await supabase
    .from("messages_groupe")
    .select("id, contenu, created_at, expediteur_id, profiles ( pseudo )")
    .order("created_at", { ascending: true })
    .limit(100);

  let pseudo: string | null = null;
  if (user) {
    const { data: profil } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .single();
    pseudo = profil?.pseudo ?? null;
  }

  const messagesFormates = (messages ?? []).map((m) => {
    const auteur = Array.isArray(m.profiles) ? m.profiles[0] : m.profiles;
    return {
      id: m.id,
      contenu: m.contenu,
      created_at: m.created_at,
      expediteur_id: m.expediteur_id,
      pseudo: auteur?.pseudo ?? "Membre AccoladeS",
    };
  });

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-8 py-10">
      <SiteHeader />

      <h1 className="font-display text-3xl mb-1">Le salon</h1>
      <p className="text-ink/60 mb-8">
        Un salon ouvert à toute la communauté — visible par tous, écriture réservée aux membres connectés.
      </p>

      <SalonChat
        messagesInitiaux={messagesFormates}
        utilisateurId={user?.id ?? null}
        pseudoUtilisateur={pseudo}
      />
    </main>
  );
}
