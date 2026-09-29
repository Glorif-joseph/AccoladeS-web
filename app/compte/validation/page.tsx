import { redirect } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import BoutonRefuser from "@/components/BoutonRefuser";
import { createClient } from "@/lib/supabase/server";
import { validerAchat } from "@/app/compte/achats/actions";

export const revalidate = 0;

// Reprend visuellement validation.tsx (grande carte, preuve affichée en
// grand, boutons ✕/✓ verts et rouges). La logique de données, elle, suit
// /compte/achats plutôt que validation.tsx : la vraie table `achats` a une
// colonne `statut_verification` (pas `statut`) et aucune colonne
// `produit_id` (pas de titre de produit à afficher, donc "Achat du {mois}"
// à la place), déjà vérifié et documenté là-bas.
export default async function Validation() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/validation");

  const { data: ventes } = await supabase
    .from("achats")
    .select("id, mois, statut_verification, preuve_url, profiles!achats_acheteur_id_fkey(pseudo)")
    .eq("vendeur_id", user.id)
    .eq("statut_verification", "en_attente")
    .order("date_achat", { ascending: true });

  async function signer(chemin: string | null) {
    if (!chemin) return null;
    const { data } = await supabase.storage
      .from("preuves-achats")
      .createSignedUrl(chemin, 300);
    return data?.signedUrl ?? null;
  }

  const ventesAvecPreuve = await Promise.all(
    (ventes ?? []).map(async (v) => ({ ...v, preuveSignee: await signer(v.preuve_url) }))
  );

  return (
    <main className="min-h-screen">
      <SiteHeader />
      <div className="max-w-xl mx-auto px-8 py-10">
        <h1 className="font-display text-2xl font-bold text-center mb-8">
          Preuves à valider
        </h1>

        {ventesAvecPreuve.length === 0 && (
          <p className="text-center text-muted mt-10">
            Aucune preuve en attente. 🎉
          </p>
        )}

        <div className="space-y-4">
          {ventesAvecPreuve.map((v) => {
            const acheteur = Array.isArray(v.profiles) ? v.profiles[0] : v.profiles;
            const validerAction = validerAchat.bind(null, v.id);
            return (
              <div
                key={v.id}
                className="bg-paper border border-surface-border rounded-xl p-3.5 shadow-sm"
              >
                <p className="text-sm text-ink/70">{acheteur?.pseudo ?? "Un membre"} a acheté</p>
                <p className="text-base font-bold mb-2.5">Achat du {v.mois}</p>

                {v.preuveSignee && (
                  <img
                    src={v.preuveSignee}
                    alt="Preuve d'achat"
                    className="w-full h-[220px] object-cover rounded-lg bg-surface mb-3"
                  />
                )}

                <div className="flex gap-2.5">
                  <BoutonRefuser action={validerAction} />
                  <form action={validerAction}>
                    <input type="hidden" name="decision" value="validé" />
                    <button
                      type="submit"
                      className="flex-1 rounded-lg bg-success text-white font-bold text-sm py-3"
                    >
                      ✓ Valider
                    </button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
