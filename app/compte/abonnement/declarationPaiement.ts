"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Premier jour du mois en cours (AAAA-MM-01), même repère que la colonne
// `mois` de la table des abonnements.
function moisCourant() {
  const maintenant = new Date();
  const mois = String(maintenant.getUTCMonth() + 1).padStart(2, "0");
  return `${maintenant.getUTCFullYear()}-${mois}-01`;
}

// Le membre déclare avoir payé son abonnement du mois (« J'ai payé »).
// La déclaration est enregistrée « en attente » : elle doit être vérifiée,
// puis passée à « validé » ou « refusé » par toi. Un membre ne peut jamais
// valider lui-même sa déclaration (voir les règles de sécurité SQL).
export async function declarerPaiement(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/abonnement");

  const reference = ((formData.get("reference") as string) ?? "").trim().slice(0, 100);
  const mois = moisCourant();

  const { data: existante } = await supabase
    .from("declarations_paiement")
    .select("id, statut")
    .eq("profile_id", user.id)
    .eq("mois", mois)
    .maybeSingle();

  // Déjà déclaré (en attente ou validé) : rien à refaire.
  if (existante && existante.statut !== "refusé") {
    redirect("/compte/abonnement?declaration=deja");
  }

  // Après un refus, le membre peut déclarer à nouveau.
  const { error } = existante
    ? await supabase
        .from("declarations_paiement")
        .update({
          statut: "en_attente",
          reference: reference || null,
          created_at: new Date().toISOString(),
        })
        .eq("id", existante.id)
    : await supabase.from("declarations_paiement").insert({
        profile_id: user.id,
        mois,
        reference: reference || null,
      });

  if (error) {
    redirect(
      `/compte/abonnement?declaration=erreur&detail=${encodeURIComponent(error.message)}`
    );
  }

  revalidatePath("/compte/abonnement");
  redirect("/compte/abonnement?declaration=ok");
}
