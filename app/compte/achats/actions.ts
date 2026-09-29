"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function premierJourDuMoisEnCours() {
  const d = new Date();
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), 1))
    .toISOString()
    .slice(0, 10);
}

export async function declarerAchat(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/connexion?redirect=/compte/achats");
  }

  const vendeurId = formData.get("vendeurId") as string;
  const preuve = formData.get("preuve") as File | null;

  if (!vendeurId) {
    redirect(`/compte/achats?erreur=${encodeURIComponent("Choisis un membre à qui déclarer ton achat.")}`);
  }
  if (!preuve || preuve.size === 0) {
    redirect(`/compte/achats?erreur=${encodeURIComponent("Ajoute une preuve d'achat (capture, photo...).")}`);
  }

  const mois = premierJourDuMoisEnCours();
  const chemin = `${user.id}/${mois}-${Date.now()}-${preuve.name}`;

  const { error: erreurUpload } = await supabase.storage
    .from("preuves-achats")
    .upload(chemin, preuve, { contentType: preuve.type });

  if (erreurUpload) {
    redirect(`/compte/achats?erreur=${encodeURIComponent(erreurUpload.message)}`);
  }

  const { error: erreurInsert } = await supabase.from("achats").insert({
    acheteur_id: user.id,
    vendeur_id: vendeurId,
    mois,
    preuve_url: chemin,
    statut_verification: "en_attente",
  });

  if (erreurInsert) {
    redirect(`/compte/achats?erreur=${encodeURIComponent(erreurInsert.message)}`);
  }

  revalidatePath("/compte/achats");
}

export async function validerAchat(achatId: string, formData: FormData) {
  const decision = formData.get("decision") as "validé" | "refusé";
  if (decision !== "validé" && decision !== "refusé") return;

  const supabase = await createClient();
  // La policy RLS (`auth.uid() = vendeur_id`) protège déjà cette mise à
  // jour : un acheteur ne peut pas valider son propre achat.
  await supabase
    .from("achats")
    .update({ statut_verification: decision })
    .eq("id", achatId);

  revalidatePath("/compte/achats");
}
