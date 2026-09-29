"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export async function basculerLike(produitId: string) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?redirect=/produits/${produitId}`);
  }

  const { data: existant } = await supabase
    .from("likes")
    .select("id")
    .eq("produit_id", produitId)
    .eq("utilisateur_id", user.id)
    .maybeSingle();

  if (existant) {
    await supabase.from("likes").delete().eq("id", existant.id);
  } else {
    await supabase
      .from("likes")
      .insert({ produit_id: produitId, utilisateur_id: user.id });
  }

  revalidatePath(`/produits/${produitId}`);
  revalidatePath("/produits");
}

export async function publierCommentaire(produitId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/connexion?redirect=/produits/${produitId}`);
  }

  const contenu = (formData.get("contenu") as string)?.trim();
  if (!contenu) return;

  await supabase.from("commentaires").insert({
    produit_id: produitId,
    utilisateur_id: user.id,
    contenu,
  });

  revalidatePath(`/produits/${produitId}`);
}
