import SiteHeader from "@/components/SiteHeader";
import MembreDetailContent from "@/components/MembreDetailContent";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

// Remplace l'approximation précédente : reprend maintenant fidèlement
// DetailMembreScreen (couverture en carrousel, avatar, stats, bio,
// Suivre/Message/Appeler, campagnes + produits publiés).
export default async function FicheMembre({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: membre } = await supabase
    .from("profiles")
    .select(
      "id, pseudo, pays, telephone, statut_actuel, photo_url, photo_couverture_url, photos_couverture, photos_avatar, bio, points"
    )
    .eq("id", id)
    .single();

  if (!membre) notFound();

  const photosCouverture =
    membre.photos_couverture?.length
      ? membre.photos_couverture
      : membre.photo_couverture_url
      ? [membre.photo_couverture_url]
      : [];
  const photosAvatar =
    membre.photos_avatar?.length
      ? membre.photos_avatar
      : membre.photo_url
      ? [membre.photo_url]
      : [];

  const [{ data: produits }, { data: campagnes }, { count: nbFollowers }, { count: nbSuivis }] =
    await Promise.all([
      supabase
        .from("produits")
        .select("id, titre, description, prix, image_url")
        .eq("profile_id", id)
        .order("date_publication", { ascending: false }),
      supabase
        .from("campagnes")
        .select("id, titre, prix, media_url, media_type, date_fin")
        .eq("profile_id", id)
        .order("created_at", { ascending: false }),
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
    <main className="min-h-screen pb-10">
      <SiteHeader />
      <MembreDetailContent
        membre={membre}
        photosCouverture={photosCouverture}
        photosAvatar={photosAvatar}
        nbFollowers={nbFollowers ?? 0}
        nbSuivis={nbSuivis ?? 0}
        estMonProfil={!!user && user.id === id}
        produits={produits ?? []}
        campagnes={campagnes ?? []}
      />
    </main>
  );
}
