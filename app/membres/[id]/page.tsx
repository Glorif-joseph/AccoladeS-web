import Image from "next/image";
import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import PalierBadge from "@/components/PalierBadge";
import SuivreBouton from "@/components/SuivreBouton";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

// La fiche membre réelle de l'app (membre_id.tsx / membre-detail.tsx,
// plusieurs versions vues dans tes fichiers : membre-id.tsx,
// membre-id-v2.tsx...) n'a pas été partagée. Cette page est une
// approximation raisonnable à partir du schéma `profiles` + `produits` —
// à refaire à l'identique si tu partages le vrai fichier.
export default async function FicheMembre({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: profil } = await supabase
    .from("profiles")
    .select("id, pseudo, pays, statut_actuel, photo_url, bio, points")
    .eq("id", id)
    .single();

  if (!profil) notFound();

  const { data: produits } = await supabase
    .from("produits")
    .select("id, titre, prix, image_url")
    .eq("profile_id", id)
    .order("date_publication", { ascending: false });

  const [{ count: nbFollowers }, { count: nbSuivis }] = await Promise.all([
    supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("suivi_id", id),
    supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", id),
  ]);

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-2xl mx-auto px-8 py-8">
        <div className="flex items-center gap-4 mb-4">
          {profil.photo_url ? (
            <Image
              src={profil.photo_url}
              alt=""
              width={72}
              height={72}
              className="rounded-full object-cover"
            />
          ) : (
            <div className="w-[72px] h-[72px] rounded-full bg-anthracite flex items-center justify-center text-accent text-2xl font-bold">
              {profil.pseudo?.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="flex-1">
            <p className="font-display text-2xl font-bold">{profil.pseudo}</p>
            {profil.pays && <p className="text-sm text-muted">{profil.pays}</p>}
          </div>
          <PalierBadge statut={profil.statut_actuel ?? "Nouveau"} />
        </div>

        <div className="flex items-center gap-6 mb-4">
          <div>
            <p className="text-lg font-bold">{nbFollowers ?? 0}</p>
            <p className="text-xs text-muted">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold">{nbSuivis ?? 0}</p>
            <p className="text-xs text-muted">Suivis</p>
          </div>
          <div className="ml-auto">
            <SuivreBouton suiviId={profil.id} />
          </div>
        </div>

        {profil.bio && (
          <div className="bg-surface border border-surface-border rounded-[10px] p-3.5 mb-6">
            <p className="text-[11px] uppercase text-muted mb-1.5">Bio</p>
            <p className="text-sm">{profil.bio}</p>
          </div>
        )}

        <h2 className="text-[17px] font-bold mb-3">Produits publiés</h2>
        {!produits?.length ? (
          <p className="text-muted text-sm">Aucun produit publié.</p>
        ) : (
          <div className="space-y-2.5">
            {produits.map((p) => (
              <Link
                key={p.id}
                href={`/produits/${p.id}`}
                className="flex items-center gap-3 py-2.5 border-b border-surface-border"
              >
                {p.image_url ? (
                  <Image
                    src={p.image_url}
                    alt=""
                    width={48}
                    height={48}
                    className="rounded-lg object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-surface shrink-0" />
                )}
                <p className="text-sm flex-1 truncate">{p.titre}</p>
                <p className="text-sm font-bold">{p.prix} $</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
