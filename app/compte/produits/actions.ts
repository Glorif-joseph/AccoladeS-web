"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function creerProduit(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?redirect=/compte/produits/nouveau");
  }

  const titre = (formData.get("titre") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const lienBoutique = (formData.get("lien_boutique") as string)?.trim();
  const trimestre = (formData.get("trimestre") as string)?.trim();
  const image = formData.get("image") as File | null;

  if (!titre) {
    redirect(
      `/compte/produits/nouveau?erreur=${encodeURIComponent("Le titre est obligatoire.")}`
    );
  }

  let imageUrl: string | null = null;

  if (image && image.size > 0) {
    const chemin = `${user.id}/${Date.now()}-${image.name}`;
    const { error: erreurUpload } = await supabase.storage
      .from("produits-images")
      .upload(chemin, image, { contentType: image.type });

    if (erreurUpload) {
      redirect(
        `/compte/produits/nouveau?erreur=${encodeURIComponent(erreurUpload.message)}`
      );
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("produits-images").getPublicUrl(chemin);
    imageUrl = publicUrl;
  }

  // `prix` est fixé à 2.00 par une contrainte CHECK en base (produits_prix_check) :
  // tous les produits AccoladeS coûtent le même prix, pas de champ éditable ici.
  const { data: nouveauProduit, error: erreurInsert } = await supabase
    .from("produits")
    .insert({
      profile_id: user.id,
      titre,
      description: description || null,
      lien_boutique: lienBoutique || null,
      trimestre: trimestre || null,
      image_url: imageUrl,
      prix: 2.0,
    })
    .select("id")
    .single();

  if (erreurInsert) {
    redirect(
      `/compte/produits/nouveau?erreur=${encodeURIComponent(erreurInsert.message)}`
    );
  }

  revalidatePath("/compte/produits");
  revalidatePath("/produits");
  redirect(`/produits/${nouveauProduit!.id}`);
}

export async function supprimerProduit(produitId: string) {
  const supabase = await createClient();
  await supabase.from("produits").delete().eq("id", produitId);
  revalidatePath("/compte/produits");
  revalidatePath("/produits");
}
