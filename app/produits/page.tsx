import SiteHeader from "@/components/SiteHeader";
import ProduitsListe from "@/components/ProduitsListe";
import CampagnesRangee from "@/components/CampagnesRangee";
import { createClient } from "@/lib/supabase/server";

export const revalidate = 0;

// Reconstruite pour de bon cette fois : reprend produits.tsx (ProduitsScreen)
// — recherche, likes, commentaires, partage, bouton boutique. Deux écarts
// assumés faute de code/schéma disponible :
// 1. Le badge "🚀 Boosté" (produits les moins vendus mis en avant) dépend de
//    `achats.produit_id`, colonne qui n'existe pas réellement (même écart
//    documenté ailleurs pour /compte/achats et /compte/validation) —
//    omis plutôt que de calculer sur une colonne inexistante.
// 2. `AvatarRotatif.tsx` n'a pas été partagé — remplacé par un avatar simple
//    (photo_url, pas de rotation entre plusieurs photos).
export default async function Produits() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Équivalent web du useFocusEffect de l'app (marque la visite à chaque
  // affichage de l'écran Produits) : un rendu de page = une visite ici,
  // approximation raisonnable côté web.
  if (user) {
    await supabase
      .from("profiles")
      .update({ derniere_visite_produits: new Date().toISOString() })
      .eq("id", user.id);
  }

  const { data, error } = await supabase
    .from("produits")
    .select(
      `id, titre, description, lien_boutique, prix, image_url, profile_id, bloque_jusqu_a,
       profiles ( pseudo, statut_actuel, photo_url )`
    )
    .order("date_publication", { ascending: false });

  const idsProduits = (data ?? []).map((p) => p.id);

  const [{ data: likesData }, { data: commentairesData }] = await Promise.all([
    supabase.from("likes").select("produit_id, utilisateur_id").in("produit_id", idsProduits.length ? idsProduits : [""]),
    supabase.from("commentaires").select("produit_id").in("produit_id", idsProduits.length ? idsProduits : [""]),
  ]);

  const compteLikes: Record<string, number> = {};
  const mesLikes = new Set<string>();
  (likesData ?? []).forEach((l) => {
    compteLikes[l.produit_id] = (compteLikes[l.produit_id] || 0) + 1;
    if (l.utilisateur_id === user?.id) mesLikes.add(l.produit_id);
  });

  const compteCommentaires: Record<string, number> = {};
  (commentairesData ?? []).forEach((c) => {
    compteCommentaires[c.produit_id] = (compteCommentaires[c.produit_id] || 0) + 1;
  });

  const produits = (data ?? []).map((p) => {
    const profil = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    return {
      ...p,
      profiles: profil ?? null,
      nb_likes: compteLikes[p.id] || 0,
      nb_commentaires: compteCommentaires[p.id] || 0,
      aime: mesLikes.has(p.id),
    };
  });

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-6xl mx-auto px-8 py-8">
        {error && (
          <p className="text-danger mb-4">
            Impossible de charger les produits pour le moment.
          </p>
        )}
        <ProduitsListe
          produits={produits}
          utilisateurId={user?.id ?? null}
          campagnesRangee={<CampagnesRangee />}
        />
      </div>
    </main>
  );
}
