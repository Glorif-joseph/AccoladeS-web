import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supprimerCampagne } from "./actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function MesCampagnes() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/campagnes");

  const { data: mesCampagnes } = await supabase
    .from("campagnes")
    .select("id, titre, date_fin, objectif_reservations")
    .eq("profile_id", user.id)
    .order("date_fin", { ascending: false });

  // Pour chaque campagne, le propriétaire voit toutes les réservations et
  // commandes reçues (policy RLS dédiée), contrairement à un visiteur.
  const campagnesAvecCompteurs = await Promise.all(
    (mesCampagnes ?? []).map(async (c) => {
      const [{ count: nbReservations }, { count: nbCommandes }] = await Promise.all([
        supabase
          .from("campagne_reservations")
          .select("id", { count: "exact", head: true })
          .eq("campagne_id", c.id),
        supabase
          .from("campagne_commandes")
          .select("id", { count: "exact", head: true })
          .eq("campagne_id", c.id),
      ]);
      return { ...c, nbReservations: nbReservations ?? 0, nbCommandes: nbCommandes ?? 0 };
    })
  );

  const { data: mesReservations } = await supabase
    .from("campagne_reservations")
    .select("id, created_at, campagnes ( id, titre )")
    .eq("utilisateur_id", user.id)
    .order("created_at", { ascending: false });

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-8 py-10">
      <SiteHeader />

      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl">Mes campagnes</h1>
        <Link
          href="/compte/campagnes/nouveau"
          className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
        >
          + Nouvelle campagne
        </Link>
      </div>

      {campagnesAvecCompteurs.length === 0 && (
        <p className="text-ink/50 mb-16">Tu n&rsquo;as encore créé aucune campagne.</p>
      )}

      <ul className="space-y-4 mb-16">
        {campagnesAvecCompteurs.map((c) => (
          <li
            key={c.id}
            className="flex items-center justify-between gap-4 border-b border-ink/10 pb-4"
          >
            <div>
              <Link
                href={`/campagnes/${c.id}`}
                className="font-medium hover:text-accent transition-colors"
              >
                {c.titre}
              </Link>
              <p className="text-sm text-ink/50">
                {c.nbReservations} réservation{c.nbReservations > 1 ? "s" : ""}
                {c.objectif_reservations ? ` / ${c.objectif_reservations}` : ""} —{" "}
                {c.nbCommandes} commande{c.nbCommandes > 1 ? "s" : ""}
              </p>
            </div>
            <form action={supprimerCampagne.bind(null, c.id)}>
              <button
                type="submit"
                className="text-sm text-danger hover:underline underline-offset-4"
              >
                Supprimer
              </button>
            </form>
          </li>
        ))}
      </ul>

      <h2 className="font-display text-xl mb-4">Mes réservations</h2>
      {mesReservations && mesReservations.length === 0 && (
        <p className="text-ink/50 text-sm">Aucune réservation pour l&rsquo;instant.</p>
      )}
      <ul className="space-y-2">
        {mesReservations?.map((r) => {
          const campagne = Array.isArray(r.campagnes) ? r.campagnes[0] : r.campagnes;
          return (
            <li key={r.id} className="text-sm">
              {campagne ? (
                <Link href={`/campagnes/${campagne.id}`} className="hover:text-accent transition-colors">
                  {campagne.titre}
                </Link>
              ) : (
                <span className="text-ink/40">Campagne expirée ou indisponible</span>
              )}
            </li>
          );
        })}
      </ul>
    </main>
  );
}
