import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SalonChat from "@/components/SalonChat";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

// Corrige le "pas en plein écran" signalé : le wrapper est maintenant
// `flex flex-col h-[100dvh]`, avec SiteHeader en shrink-0 et SalonChat en
// flex-1 — ça marche quelle que soit la hauteur réelle de l'en-tête (52px
// seul si déconnecté, 104px avec la barre turquoise AccentBar si connecté),
// plutôt qu'une hauteur calc() figée qui supposait 52px partout.
export default async function Salon() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/salon");

  await supabase
    .from("profiles")
    .update({ derniere_visite_salon: new Date().toISOString() })
    .eq("id", user.id);

  const { data } = await supabase
    .from("messages_groupe")
    .select("id, expediteur_id, contenu, created_at, image_url")
    .order("created_at", { ascending: true })
    .limit(100);

  const idsExpediteurs = [...new Set((data ?? []).map((m) => m.expediteur_id))];
  const { data: profils } = await supabase
    .from("profiles")
    .select("id, pseudo, photo_url, statut_actuel")
    .in("id", idsExpediteurs.length ? idsExpediteurs : [""]);

  const profilParId: Record<
    string,
    { pseudo: string; photo_url: string | null; statut_actuel: string | null }
  > = {};
  (profils ?? []).forEach((p) => {
    profilParId[p.id] = p;
  });

  const messages = (data ?? []).map((m) => {
    const profil = profilParId[m.expediteur_id];
    return {
      ...m,
      pseudoExpediteur: profil?.pseudo ?? "Membre",
      photoExpediteur: profil?.photo_url ?? null,
      statutExpediteur: profil?.statut_actuel ?? null,
    };
  });

  return (
    <main className="flex flex-col h-[100dvh]">
      <div className="shrink-0">
        <SiteHeader />
      </div>
      <SalonChat messagesInitiaux={messages} utilisateurId={user.id} />
    </main>
  );
}
