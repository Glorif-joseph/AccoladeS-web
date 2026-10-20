import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

// Lien de paiement des abonnements (Mobile Money, PayPal, Flutterwave…).
// Colle ton adresse entre les guillemets, par exemple
// "https://paiement.exemple.com/accolades". Tant que c'est vide, le bouton
// « Payer mon abonnement » n'apparaît pas.
const LIEN_PAIEMENT = "";

const LIBELLES: Record<string, { texte: string; classe: string }> = {
  payé: { texte: "Payé", classe: "text-success" },
  en_attente: { texte: "En attente", classe: "text-ink/50" },
  raté: { texte: "Raté", classe: "text-danger" },
};

export default async function Abonnement() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/abonnement");

  const { data: abonnements } = await supabase
    .from("abonnements")
    .select("id, mois, statut, montant, date_paiement")
    .eq("profile_id", user.id)
    .order("mois", { ascending: false });

  return (
    <main className="min-h-screen max-w-2xl mx-auto px-8 py-10">
      <SiteHeader />

      <Link href="/compte" className="text-sm text-ink/50 hover:text-accent transition-colors">
        ← Mon compte
      </Link>
      <h1 className="font-display text-3xl mt-3 mb-8">Mon abonnement</h1>

      {LIEN_PAIEMENT && (
        <section className="bg-surface border border-surface-border rounded-xl p-4 mb-8">
          <h2 className="text-[17px] font-bold mb-1">Payer mon abonnement</h2>
          <p className="text-sm text-ink/60 mb-3.5">
            Règle ton abonnement avec le lien de paiement. Il s&rsquo;ouvre dans un nouvel
            onglet.
          </p>
          <a
            href={LIEN_PAIEMENT}
            target="_blank"
            rel="noopener noreferrer"
            className="block w-full text-center rounded-full bg-accent text-accent-ink font-semibold text-sm py-3"
          >
            Payer mon abonnement
          </a>
        </section>
      )}

      {(!abonnements || abonnements.length === 0) && (
        <p className="text-ink/50 text-sm">Aucun abonnement enregistré pour l&rsquo;instant.</p>
      )}

      <ul className="divide-y divide-surface-border">
        {abonnements?.map((a) => {
          const libelle = LIBELLES[a.statut] ?? { texte: a.statut, classe: "text-ink/50" };
          return (
            <li key={a.id} className="flex items-center justify-between py-4">
              <span className="capitalize">
                {new Date(a.mois).toLocaleDateString("fr-FR", {
                  month: "long",
                  year: "numeric",
                })}
              </span>
              <span className="text-sm text-ink/50">{a.montant} $</span>
              <span className={`text-sm font-medium ${libelle.classe}`}>{libelle.texte}</span>
            </li>
          );
        })}
      </ul>
    </main>
  );
}
