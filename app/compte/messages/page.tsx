import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import MessagesListe from "@/components/MessagesListe";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

// Reprend MessagesScreen, SAUF la section "Groupes" : elle dépend d'une
// table `groupes` qui n'existe pas dans la vraie base (vérifié en SQL) —
// même catégorie d'écart que pour Validations/Produits. Dis-moi si ce
// système doit encore être créé côté base avant que je le construise ici.
export default async function Messages() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/messages");

  const { data: monProfil } = await supabase
    .from("profiles")
    .select("derniere_visite_salon")
    .eq("id", user.id)
    .single();

  const depuisSalon = monProfil?.derniere_visite_salon ?? "1970-01-01T00:00:00Z";
  const { count: nbNouveauxSalon } = await supabase
    .from("messages_groupe")
    .select("id", { count: "exact", head: true })
    .gt("created_at", depuisSalon)
    .neq("expediteur_id", user.id);

  const { data } = await supabase
    .from("messages_prives")
    .select("expediteur_id, destinataire_id, contenu, created_at, lu")
    .or(`expediteur_id.eq.${user.id},destinataire_id.eq.${user.id}`)
    .order("created_at", { ascending: false });

  const parAutre: Record<
    string,
    { contenu: string; created_at: string; destinataire_id: string; lu: boolean }
  > = {};
  (data ?? []).forEach((m) => {
    const autreId = m.expediteur_id === user.id ? m.destinataire_id : m.expediteur_id;
    if (!parAutre[autreId]) parAutre[autreId] = m;
  });

  const idsAutres = Object.keys(parAutre);
  const { data: profils } = await supabase
    .from("profiles")
    .select("id, pseudo, photo_url")
    .in("id", idsAutres.length ? idsAutres : [""]);

  const profilParId: Record<string, { pseudo: string; photo_url: string | null }> = {};
  (profils ?? []).forEach((p) => {
    profilParId[p.id] = p;
  });

  const conversations = idsAutres
    .map((autreId) => ({
      autreId,
      autrePseudo: profilParId[autreId]?.pseudo ?? "Membre",
      autrePhoto: profilParId[autreId]?.photo_url ?? null,
      dernierMessage: parAutre[autreId].contenu,
      dateDernierMessage: parAutre[autreId].created_at,
      nonLu: parAutre[autreId].destinataire_id === user.id && !parAutre[autreId].lu,
    }))
    .sort((a, b) => (a.dateDernierMessage < b.dateDernierMessage ? 1 : -1));

  // Plus de conteneur max-w ni de padding ici, et plus de titre : le titre
  // « Messages » est maintenant rendu par MessagesListe.
  return (
    <div className="w-full min-h-screen bg-paper flex flex-col">
      <SiteHeader />
      <main className="flex-1 flex flex-col">
        <MessagesListe
          conversations={conversations}
          nbNouveauxSalon={nbNouveauxSalon ?? 0}
        />
      </main>
    </div>
  );
}
