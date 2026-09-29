"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function marquerCommeLue(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte/notifications");

  const id = formData.get("id") as string;
  if (!id) return;

  // La policy RLS `auth.uid() = profile_id` empêche déjà un membre de
  // marquer comme lue la notification d'un autre — le `.eq` ci-dessous est
  // une ceinture-bretelles, pas la seule protection.
  await supabase
    .from("notifications")
    .update({ lu: true })
    .eq("id", id)
    .eq("profile_id", user.id);

  revalidatePath("/compte/notifications");
}

export async function marquerToutesCommeLues() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/connexion?redirect=/compte/notifications");

  await supabase
    .from("notifications")
    .update({ lu: true })
    .eq("profile_id", user.id)
    .eq("lu", false);

  revalidatePath("/compte/notifications");
}
