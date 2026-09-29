"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function creerPulse(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?redirect=/compte/pulses/nouveau");
  }

  const media = formData.get("media") as File | null;

  if (!media || media.size === 0) {
    redirect(`/compte/pulses/nouveau?erreur=${encodeURIComponent("Ajoute une photo ou une vidéo.")}`);
  }

  // Chemin préfixé par l'id utilisateur, exigé par la policy RLS du bucket.
  const chemin = `${user.id}/${Date.now()}-${media!.name}`;
  const { error: erreurUpload } = await supabase.storage
    .from("pulses")
    .upload(chemin, media!, { contentType: media!.type });

  if (erreurUpload) {
    redirect(`/compte/pulses/nouveau?erreur=${encodeURIComponent(erreurUpload.message)}`);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from("pulses").getPublicUrl(chemin);

  // `expires_at` a un défaut en base (`now() + 24h`) : pas besoin de le
  // fixer ici, ça reste cohérent avec ce que fait l'app mobile.
  const { error: erreurInsert } = await supabase.from("pulses").insert({
    profile_id: user.id,
    media_url: publicUrl,
    media_type: media!.type.startsWith("video") ? "video" : "photo",
  });

  if (erreurInsert) {
    redirect(`/compte/pulses/nouveau?erreur=${encodeURIComponent(erreurInsert.message)}`);
  }

  revalidatePath("/compte/pulses");
  revalidatePath("/pulses");
  redirect("/compte/pulses");
}

export async function supprimerPulse(pulseId: string) {
  const supabase = await createClient();
  await supabase.from("pulses").delete().eq("id", pulseId);
  revalidatePath("/compte/pulses");
  revalidatePath("/pulses");
}
