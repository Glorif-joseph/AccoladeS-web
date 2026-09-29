"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function reserverCampagne(campagneId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?redirect=/campagnes/${campagneId}`);
  }

  await supabase.from("campagne_reservations").insert({
    campagne_id: campagneId,
    utilisateur_id: user.id,
  });

  revalidatePath(`/campagnes/${campagneId}`);
}

export async function commanderCampagne(campagneId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?redirect=/campagnes/${campagneId}`);
  }

  await supabase.from("campagne_commandes").insert({
    campagne_id: campagneId,
    utilisateur_id: user.id,
  });

  revalidatePath(`/campagnes/${campagneId}`);
}
