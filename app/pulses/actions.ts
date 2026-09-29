"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export async function basculerLikePulse(pulseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?redirect=/pulses");
  }

  const { data: existant } = await supabase
    .from("pulse_likes")
    .select("id")
    .eq("pulse_id", pulseId)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (existant) {
    await supabase.from("pulse_likes").delete().eq("id", existant.id);
  } else {
    await supabase.from("pulse_likes").insert({ pulse_id: pulseId, utilisateur_id: user.id });
  }

  revalidatePath("/pulses");
}

export async function enregistrerVue(pulseId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Vue anonyme : rien à faire, la policy RLS ("auth.uid() = viewer_id")
  // refuserait de toute façon l'insertion.
  if (!user) return;

  const { data: existante } = await supabase
    .from("pulse_vues")
    .select("id")
    .eq("pulse_id", pulseId)
    .eq("viewer_id", user.id)
    .maybeSingle();

  if (!existante) {
    await supabase.from("pulse_vues").insert({ pulse_id: pulseId, viewer_id: user.id });
  }
}
