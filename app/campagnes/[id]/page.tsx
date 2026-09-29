import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { reserverCampagne, commanderCampagne } from "../actions";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function DetailCampagne({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: campagne } = await supabase
    .from("campagnes")
    .select(
      "id, titre, description, prix, media_url, media_type, date_fin, objectif_reservations, profiles ( pseudo )"
    )
    .eq("id", id)
    .single();

  if (!campagne) {
    notFound();
  }

  const auteur = Array.isArray(campagne.profiles) ? campagne.profiles[0] : campagne.profiles;

  // Compteur public réel depuis la phase suivante : la RLS de
  // campagne_reservations/commandes ne rend visibles que mes propres
  // lignes, donc un simple SELECT ne peut pas donner le vrai total à un
  // visiteur quelconque. `campagne_compteurs` est une fonction Postgres
  // SECURITY DEFINER dédiée : elle ne renvoie que deux nombres (aucune
  // ligne, aucune identité), ce qui contourne la RLS de façon contrôlée
  // sans rien exposer de plus que ce compteur.
  const { data: compteurs } = await supabase.rpc("campagne_compteurs", {
    p_campagne_id: campagne.id,
  });
  const totalReservations = compteurs?.[0]?.reservations ?? 0;

  let dejaReserve = false;
  let dejaCommande = false;
  if (user) {
    const [{ data: reservation }, { data: commande }] = await Promise.all([
      supabase
        .from("campagne_reservations")
        .select("id")
        .eq("campagne_id", campagne.id)
        .eq("utilisateur_id", user.id)
        .maybeSingle(),
      supabase
        .from("campagne_commandes")
        .select("id")
        .eq("campagne_id", campagne.id)
        .eq("utilisateur_id", user.id)
        .maybeSingle(),
    ]);
    dejaReserve = !!reservation;
    dejaCommande = !!commande;
  }

  const reserverAction = reserverCampagne.bind(null, campagne.id);
  const commanderAction = commanderCampagne.bind(null, campagne.id);

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <article className="max-w-4xl mx-auto px-8 pb-20">
        <div className="aspect-[4/3] bg-accent/10 rounded-2xl overflow-hidden relative mb-8">
          {campagne.media_url && campagne.media_type === "photo" ? (
            <Image
              src={campagne.media_url}
              alt={campagne.titre}
              fill
              sizes="(max-width: 896px) 100vw, 896px"
              className="object-cover"
              priority
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-accent/30 font-display text-3xl">
              AccoladeS
            </div>
          )}
        </div>

        <div className="flex items-start justify-between gap-8 flex-wrap">
          <div>
            <h1 className="font-display text-3xl mb-2">{campagne.titre}</h1>
            <p className="text-ink/60">
              Par <span className="text-ink">{auteur?.pseudo ?? "Membre AccoladeS"}</span>
            </p>
          </div>
          <p className="font-display text-2xl">{campagne.prix} €</p>
        </div>

        {campagne.description && (
          <p className="mt-6 text-ink/80 leading-relaxed max-w-xl">{campagne.description}</p>
        )}

        <div className="mt-4 text-sm text-ink/50 space-y-1">
          <p>
            Se termine le{" "}
            {new Date(campagne.date_fin).toLocaleDateString("fr-FR", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </p>
          {campagne.objectif_reservations && (
            <p>
              {totalReservations} / {campagne.objectif_reservations} réservations
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-4 mt-8">
          {user ? (
            <>
              <form action={reserverAction}>
                <button
                  type="submit"
                  disabled={dejaReserve}
                  className="rounded-full border border-accent text-accent px-6 py-2 text-sm hover:bg-accent hover:text-paper transition-colors disabled:opacity-50 disabled:hover:bg-transparent disabled:hover:text-accent"
                >
                  {dejaReserve ? "Réservé ✓" : "Réserver"}
                </button>
              </form>
              <form action={commanderAction}>
                <button
                  type="submit"
                  disabled={dejaCommande}
                  className="rounded-full bg-accent text-ink px-6 py-2 text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-50"
                >
                  {dejaCommande ? "Commandé ✓" : "Commander"}
                </button>
              </form>
            </>
          ) : (
            <Link
              href={`/connexion?redirect=/campagnes/${campagne.id}`}
              className="rounded-full bg-accent text-paper px-6 py-2 text-sm hover:bg-accent-light transition-colors"
            >
              Se connecter pour réserver ou commander
            </Link>
          )}
        </div>
      </article>
    </main>
  );
}
