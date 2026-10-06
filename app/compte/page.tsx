import { redirect } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { createClient } from "@/lib/supabase/server";
import { seDeconnecter } from "../(auth)/actions";
import { enregistrerBio } from "./actions";
import SiteHeader from "@/components/SiteHeader";
import ProfilPhotos from "@/components/ProfilPhotos";

export const revalidate = 0;

const SEUILS_PALIER = [
  { nom: "Nouveau", min: 0, max: 999 },
  { nom: "Actif", min: 1000, max: 4999 },
  { nom: "Confirmé", min: 5000, max: 9999 },
  { nom: "Ambassadeur", min: 10000, max: Infinity },
];

const LIBELLES_ACHAT: Record<string, string> = {
  en_attente: "En attente",
  validé: "Validé",
  refusé: "Refusé",
};

// Reprend la structure de app/(tabs)/profil.tsx côté app mobile. Écart
// assumé, documenté dans le README :
// `achats` n'a pas de colonne `produit_id` dans la vraie base (vérifié en
// SQL) contrairement à ce que profil.tsx suppose (`produits ( titre )`) —
// l'historique achats/ventes affiche donc le mois + le membre concerné,
// pas un titre de produit, cohérent avec le modèle réellement en place
// (le même que /compte/achats).
// L'upload avatar/couverture (components/ProfilPhotos.tsx) est branché.
export default async function Compte() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte");

  const { data: profil } = await supabase
    .from("profiles")
    .select(
      "pseudo, email, telephone, statut_actuel, photo_url, photo_couverture_url, photos_couverture, photos_avatar, bio, points"
    )
    .eq("id", user.id)
    .single();

  if (!profil) {
    return (
      <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
        <SiteHeader />
        <p className="text-danger text-sm">
          Profil introuvable pour ce compte ({user.email}). Le compte existe
          dans auth.users mais pas encore dans profiles — probablement un
          compte créé avant la mise en place du site.
        </p>
      </main>
    );
  }

  const [
    { data: mesAchats, count: nbAchatsTotal },
    { data: mesVentes },
    { count: nbFollowers },
    { count: nbSuivis },
    { data: mesProduits },
    { data: mesCampagnes },
    { data: amendes },
  ] = await Promise.all([
    supabase
      .from("achats")
      .select("id, mois, statut_verification, profiles!achats_vendeur_id_fkey(pseudo)", {
        count: "exact",
      })
      .eq("acheteur_id", user.id)
      .order("date_achat", { ascending: false })
      .limit(10),
    supabase
      .from("achats")
      .select("id, mois, statut_verification, profiles!achats_acheteur_id_fkey(pseudo)")
      .eq("vendeur_id", user.id)
      .order("date_achat", { ascending: false })
      .limit(10),
    supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("suivi_id", user.id),
    supabase
      .from("followers")
      .select("id", { count: "exact", head: true })
      .eq("follower_id", user.id),
    supabase
      .from("produits")
      .select("id, titre, prix, image_url, date_publication, bloque_jusqu_a")
      .eq("profile_id", user.id)
      .order("date_publication", { ascending: false }),
    // Une campagne disparaît de « Mes campagnes » dès que sa date de fin est
    // dépassée : filtre explicite sur `date_fin`.
    supabase
      .from("campagnes")
      .select("id, titre, prix, media_url, date_fin")
      .eq("profile_id", user.id)
      .gt("date_fin", new Date().toISOString())
      .order("created_at", { ascending: false }),
    supabase
      .from("amendes")
      .select("id, mois_concerne, montant, statut")
      .eq("profile_id", user.id)
      .order("date_creation", { ascending: false }),
  ]);

  // Compteur de réservations par campagne, comme profil.tsx (une seule
  // requête groupée plutôt qu'une par campagne).
  const idsCampagnes = (mesCampagnes ?? []).map((c) => c.id);
  const { data: reservations } = idsCampagnes.length
    ? await supabase
        .from("campagne_reservations")
        .select("campagne_id")
        .in("campagne_id", idsCampagnes)
    : { data: [] as { campagne_id: string }[] };

  const compteReservations: Record<string, number> = {};
  (reservations ?? []).forEach((r) => {
    compteReservations[r.campagne_id] = (compteReservations[r.campagne_id] || 0) + 1;
  });

  const palierActuel = SEUILS_PALIER.find((p) => p.nom === profil.statut_actuel);
  const indexPalier = SEUILS_PALIER.findIndex((p) => p.nom === profil.statut_actuel);
  const seuilSuivant =
    palierActuel && indexPalier < SEUILS_PALIER.length - 1
      ? SEUILS_PALIER[indexPalier + 1]
      : null;
  const achatsRestants = seuilSuivant
    ? Math.max(0, seuilSuivant.min - (nbAchatsTotal ?? 0))
    : 0;



  return (
    <main className="min-h-screen pb-16">
      <SiteHeader />

      {/* Couverture, avatar, pseudo, palier — gérés par ProfilPhotos
          (carrousel + upload avatar/couverture, absent de la version
          précédente : voir components/ProfilPhotos.tsx) */}
      <ProfilPhotos
        userId={user.id}
        pseudo={profil.pseudo}
        statutActuel={profil.statut_actuel}
        photosCouvertureInitial={
          profil.photos_couverture?.length
            ? profil.photos_couverture
            : profil.photo_couverture_url
            ? [profil.photo_couverture_url]
            : []
        }
        photosAvatarInitial={
          profil.photos_avatar?.length
            ? profil.photos_avatar
            : profil.photo_url
            ? [profil.photo_url]
            : []
        }
      />

      <div className="max-w-2xl mx-auto px-8">
        {/* Stats */}
        <div className="flex gap-8 mb-4">
          <div>
            <p className="text-lg font-bold">{nbFollowers ?? 0}</p>
            <p className="text-xs text-muted">Followers</p>
          </div>
          <div>
            <p className="text-lg font-bold">{nbSuivis ?? 0}</p>
            <p className="text-xs text-muted">Suivis</p>
          </div>
          <div>
            <p className="text-lg font-bold text-accent">{profil.points}</p>
            <p className="text-xs text-muted">Acco</p>
          </div>
        </div>

        {/* Bio */}
        <form
          action={enregistrerBio}
          className="bg-surface border border-surface-border rounded-[10px] p-3.5 mb-4"
        >
          <p className="text-[11px] text-muted uppercase tracking-wide mb-1.5">Bio</p>
          <textarea
            name="bio"
            defaultValue={profil.bio ?? ""}
            placeholder="Parle un peu de toi..."
            rows={2}
            className="w-full bg-transparent text-sm outline-none resize-none placeholder:text-muted"
          />
          <button
            type="submit"
            className="mt-2 rounded-full bg-accent text-accent-ink text-xs font-semibold px-3.5 py-1.5"
          >
            Enregistrer
          </button>
        </form>

        {/* Contact */}
        {(profil.email || profil.telephone) && (
          <div className="flex gap-2.5 mb-4">
            {profil.email && (
              <a
                href={`mailto:${profil.email}`}
                className="flex-1 text-center rounded-full bg-surface border border-surface-border py-2.5 text-sm font-semibold"
              >
                📧 Email
              </a>
            )}
            {profil.telephone && (
              <a
                href={`tel:${profil.telephone}`}
                className="flex-1 text-center rounded-full bg-surface border border-surface-border py-2.5 text-sm font-semibold"
              >
                📱 Appeler
              </a>
            )}
          </div>
        )}

        {/* Abonnement */}
        <Link
          href="/compte/abonnement"
          className="flex items-center justify-center gap-2 rounded-full bg-gris-fonce text-paper py-3 font-semibold text-sm mb-5"
        >
          Mon abonnement <span aria-hidden="true">→</span>
        </Link>

        {/* Carte statistique mise en avant */}
        <div className="bg-anthracite rounded-xl p-5 text-center mb-6">
          <p className="text-3xl font-bold text-accent">{nbAchatsTotal ?? 0}</p>
          <p className="text-muted text-sm mt-0.5">achats effectués (total)</p>
          {seuilSuivant && (
            <p className="text-paper text-xs mt-2.5">
              Plus que {achatsRestants} achat{achatsRestants > 1 ? "s" : ""} pour atteindre
              &laquo;&nbsp;{seuilSuivant.nom}&nbsp;&raquo;
            </p>
          )}
        </div>

        {/* Mes produits publiés */}
        <div className="flex items-center justify-between mt-2 mb-2.5">
          <h2 className="text-[17px] font-bold">Mes produits publiés</h2>
          <Link
            href="/compte/produits/nouveau"
            className="rounded-full bg-accent text-accent-ink text-xs font-semibold px-3 py-1.5"
          >
            + Publier
          </Link>
        </div>
        {(!mesProduits || mesProduits.length === 0) && (
          <p className="text-muted text-sm mb-4">Tu n&rsquo;as encore publié aucun produit.</p>
        )}
        <ul className="mb-6">
          {mesProduits?.map((p) => {
            const bloque = p.bloque_jusqu_a && new Date(p.bloque_jusqu_a) > new Date();
            return (
              <li key={p.id} className="border-b border-surface-border">
                <Link href={`/produits/${p.id}`} className="flex items-center gap-2.5 py-2.5">
                  <span className="w-12 h-12 rounded-lg bg-surface shrink-0 overflow-hidden relative">
                    {p.image_url && (
                      <Image src={p.image_url} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">{p.titre}</span>
                    <span className="block text-xs text-muted">
                      Publié le {new Date(p.date_publication).toLocaleDateString("fr-FR")}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-bold text-accent-ink">{p.prix} $</span>
                    {bloque && <span className="block text-[11px] text-danger">Indisponible</span>}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Mes campagnes */}
        <div className="flex items-center justify-between mb-2.5">
          <h2 className="text-[17px] font-bold">Mes campagnes</h2>
          <Link
            href="/compte/campagnes/nouveau"
            className="rounded-full bg-accent text-accent-ink text-xs font-semibold px-3 py-1.5"
          >
            + Créer
          </Link>
        </div>
        {(!mesCampagnes || mesCampagnes.length === 0) && (
          <p className="text-muted text-sm mb-4">Tu n&rsquo;as aucune campagne en cours.</p>
        )}
        <ul className="mb-6">
          {mesCampagnes?.map((c) => {
            const nbReservations = compteReservations[c.id] || 0;
            return (
              <li key={c.id} className="border-b border-surface-border">
                <Link href={`/campagnes/${c.id}`} className="flex items-center gap-2.5 py-2.5">
                  <span className="w-12 h-12 rounded-lg bg-surface shrink-0 overflow-hidden relative">
                    {c.media_url && (
                      <Image src={c.media_url} alt="" fill sizes="48px" className="object-cover" />
                    )}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block text-sm truncate">{c.titre}</span>
                    <span className="block text-xs text-muted">
                      {nbReservations} réservation{nbReservations !== 1 ? "s" : ""} · Fin le{" "}
                      {new Date(c.date_fin).toLocaleDateString("fr-FR")}
                    </span>
                  </span>
                  <span className="text-right shrink-0">
                    <span className="block text-sm font-bold text-accent-ink">{c.prix} $</span>
                    <span className="block text-[11px] font-semibold text-success">Active</span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Historique d'achats — adapté au vrai schéma (déclarations mensuelles,
            pas de produit lié), voir la note en tête de fichier */}
        <h2 className="text-[17px] font-bold mt-2 mb-2.5">Historique d&rsquo;achats</h2>
        {(!mesAchats || mesAchats.length === 0) && (
          <p className="text-muted text-sm mb-4">Aucun achat pour le moment.</p>
        )}
        <ul className="mb-6">
          {mesAchats?.map((a) => {
            const vendeur = Array.isArray(a.profiles) ? a.profiles[0] : a.profiles;
            return (
              <li
                key={a.id}
                className="flex items-center justify-between py-2.5 border-b border-surface-border text-sm"
              >
                <span>
                  {a.mois} — chez <strong>{vendeur?.pseudo ?? "?"}</strong>
                </span>
                <span className="text-xs text-muted">
                  {LIBELLES_ACHAT[a.statut_verification] ?? a.statut_verification}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Historique de ventes */}
        <h2 className="text-[17px] font-bold mb-2.5">Historique de ventes</h2>
        {(!mesVentes || mesVentes.length === 0) && (
          <p className="text-muted text-sm mb-4">Aucune vente pour le moment.</p>
        )}
        <ul className="mb-6">
          {mesVentes?.map((v) => {
            const acheteur = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
            return (
              <li key={v.id} className="flex items-center justify-between py-2.5 border-b border-surface-border">
                <span className="text-sm">
                  {v.mois}
                  <span className="block text-xs text-muted">à {acheteur?.pseudo ?? "un membre"}</span>
                </span>
                <span
                  className={`text-xs capitalize ${
                    v.statut_verification === "validé" ? "text-success" : "text-danger"
                  }`}
                >
                  {v.statut_verification}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Amendes */}
        <h2 className="text-[17px] font-bold mb-2.5">Amendes</h2>
        {(!amendes || amendes.length === 0) && (
          <p className="text-muted text-sm mb-4">Aucune amende. 🎉</p>
        )}
        <ul className="mb-8">
          {amendes?.map((a) => (
            <li key={a.id} className="flex items-center justify-between py-2.5 border-b border-surface-border">
              <span>
                <span className="block text-sm font-semibold capitalize">
                  {new Date(a.mois_concerne).toLocaleDateString("fr-FR", {
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                <span
                  className={`block text-xs ${a.statut === "payé" ? "text-success" : "text-danger"}`}
                >
                  {a.statut}
                </span>
              </span>
              <span className="text-sm font-bold">{a.montant} $</span>
            </li>
          ))}
        </ul>

        <form action={seDeconnecter}>
          <button
            type="submit"
            className="text-sm text-danger font-semibold underline decoration-2 underline-offset-4"
          >
            Se déconnecter
          </button>
        </form>
      </div>
    </main>
  );
}
