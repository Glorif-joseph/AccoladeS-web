"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function creerCampagne(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?redirect=/compte/campagnes/nouveau");
  }

  const titre = (formData.get("titre") as string)?.trim();
  const description = (formData.get("description") as string)?.trim();
  const prix = Number(formData.get("prix"));
  const dateFin = formData.get("date_fin") as string;
  const objectif = formData.get("objectif_reservations") as string;
  const trimestre = (formData.get("trimestre") as string)?.trim();
  const media = formData.get("media") as File | null;

  if (!titre || !prix || !dateFin || !media || media.size === 0) {
    redirect(
      `/compte/campagnes/nouveau?erreur=${encodeURIComponent(
        "Titre, prix, date de fin et un visuel sont obligatoires."
      )}`
    );
  }

  // Contrairement au bucket produits-images, celui-ci exige que le chemin
  // commence par l'id de l'utilisateur (policy RLS storage).
  const chemin = `${user.id}/${Date.now()}-${media!.name}`;
  const { error: erreurUpload } = await supabase.storage
    .from("campagnes")
    .upload(chemin, media!, { contentType: media!.type });

  if (erreurUpload) {
    redirect(`/compte/campagnes/nouveau?erreur=${encodeURIComponent(erreurUpload.message)}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("campagnes").getPublicUrl(chemin);

  const { error: erreurInsert, data: nouvelleCampagne } = await supabase
    .from("campagnes")
    .insert({
      profile_id: user.id,
      titre,
      description: description || null,
      prix,
      media_url: publicUrl,
      media_type: media!.type.startsWith("video") ? "video" : "photo",
      date_fin: new Date(dateFin).toISOString(),
      objectif_reservations: objectif ? Number(objectif) : null,
      trimestre: trimestre || null,
    })
    .select("id")
    .single();

  if (erreurInsert) {
    redirect(`/compte/campagnes/nouveau?erreur=${encodeURIComponent(erreurInsert.message)}`);
  }

  revalidatePath("/compte/campagnes");
  revalidatePath("/campagnes");
  redirect(`/campagnes/${nouvelleCampagne!.id}`);
}

export async function supprimerCampagne(campagneId: string) {
  const supabase = await createClient();
  await supabase.from("campagnes").delete().eq("id", campagneId);
  revalidatePath("/compte/campagnes");
  revalidatePath("/campagnes");
}
