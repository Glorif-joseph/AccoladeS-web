import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

export default async function Campagnes() {
  const supabase = await createClient();

  // La policy RLS ("Campagnes actives visibles par tous", date_fin > now())
  // filtre déjà les campagnes expirées : pas besoin de le refaire ici.
  const { data: campagnes } = await supabase
    .from("campagnes")
    .select(
      "id, titre, description, prix, media_url, media_type, date_fin, objectif_reservations, profiles ( pseudo )"
    )
    .order("date_fin", { ascending: true });

  return (
    <main className="min-h-screen">
      <SiteHeader />

      <section className="max-w-6xl mx-auto px-8 py-10">
        <h1 className="font-display text-4xl mb-2">Campagnes en cours</h1>
        <p className="text-ink/60 mb-10">
          Réserve ou commande auprès des membres qui lancent une campagne.
        </p>

        {campagnes && campagnes.length === 0 && (
          <p className="text-ink/50">Aucune campagne active pour l&rsquo;instant.</p>
        )}

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {campagnes?.map((c) => {
            const auteur = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            return (
              <Link key={c.id} href={`/campagnes/${c.id}`} className="group block">
                <div className="aspect-square bg-accent/10 rounded-xl overflow-hidden relative mb-3">
                  {c.media_url && c.media_type === "photo" ? (
                    <Image
                      src={c.media_url}
                      alt={c.titre}
                      fill
                      sizes="(max-width: 768px) 50vw, 33vw"
                      className="object-cover group-hover:scale-[1.02] transition-transform"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-accent/30 font-display text-2xl">
                      AccoladeS
                    </div>
                  )}
                </div>
                <h2 className="font-display text-lg leading-snug">{c.titre}</h2>
                <div className="flex items-center justify-between mt-1 text-sm text-ink/60">
                  <span>{auteur?.pseudo ?? "Membre AccoladeS"}</span>
                  <span>{c.prix} €</span>
                </div>
                <p className="text-xs text-ink/40 mt-1">
                  Jusqu&rsquo;au{" "}
                  {new Date(c.date_fin).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </Link>
            );
          })}
        </div>
      </section>
    </main>
  );
}
