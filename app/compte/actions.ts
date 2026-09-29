"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function enregistrerBio(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte");

  const bio = formData.get("bio") as string;

  await supabase.from("profiles").update({ bio }).eq("id", user.id);

  revalidatePath("/compte");
}

// Appelées après upload côté client (voir components/ProfilPhotos.tsx) —
// l'upload lui-même se fait avec le client Supabase navigateur, comme dans
// profil.tsx côté app ; ces actions ne font que mettre à jour les colonnes
// une fois les URLs publiques obtenues.
export async function mettreAJourPhotosAvatar(urls: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte");

  await supabase
    .from("profiles")
    .update({ photos_avatar: urls, photo_url: urls[0] ?? null })
    .eq("id", user.id);

  revalidatePath("/compte");
}

export async function mettreAJourPhotosCouverture(urls: string[]) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte");

  await supabase
    .from("profiles")
    .update({ photos_couverture: urls, photo_couverture_url: urls[0] ?? null })
    .eq("id", user.id);

  revalidatePath("/compte");
}
