"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Nombre de ventes validées à partir duquel un membre peut modifier le lien
// de sa boutique (il peut toujours l'enregistrer une première fois).
const SEUIL_VENTES = 1000;

// Enregistre le lien de boutique du membre connecté.
// - Premier enregistrement : toujours possible.
// - Modification d'un lien déjà enregistré : seulement à partir de 1000
//   ventes validées. Cette règle est aussi imposée par la base (voir le
//   déclencheur SQL), pour qu'on ne puisse pas la contourner.
export async function enregistrerLienBoutique(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte");

  // « maboutique.com » devient « https://maboutique.com ».
  const saisie = ((formData.get("lien_boutique") as string) ?? "").trim();
  const avecSchema = /^https?:\/\//i.test(saisie) ? saisie : `https://${saisie}`;

  let lien = "";
  try {
    const url = new URL(avecSchema);
    if (
      (url.protocol !== "https:" && url.protocol !== "http:") ||
      !url.hostname.includes(".") ||
      saisie.length === 0 ||
      saisie.length > 300
    ) {
      throw new Error("lien invalide");
    }
    lien = url.toString();
  } catch {
    redirect("/compte?boutique=invalide#boutique");
  }

  const [{ data: profil }, { count: nbVentes }] = await Promise.all([
    supabase.from("profiles").select("lien_boutique").eq("id", user.id).single(),
    supabase
      .from("achats")
      .select("id", { count: "exact", head: true })
      .eq("vendeur_id", user.id)
      .eq("statut_verification", "validé"),
  ]);

  const lienActuel = profil?.lien_boutique as string | null | undefined;

  if (lienActuel && (nbVentes ?? 0) < SEUIL_VENTES) {
    redirect("/compte?boutique=verrouille#boutique");
  }

  if (lienActuel === lien) {
    redirect("/compte?boutique=ok#boutique");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ lien_boutique: lien })
    .eq("id", user.id);

  if (error) {
    redirect(
      `/compte?boutique=erreur&detail=${encodeURIComponent(error.message)}#boutique`
    );
  }

  revalidatePath("/compte");
  revalidatePath("/produits");
  redirect("/compte?boutique=ok#boutique");
}
