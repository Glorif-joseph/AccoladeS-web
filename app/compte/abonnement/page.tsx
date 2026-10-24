import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import SiteHeader from "@/components/SiteHeader";
import CopierCompte from "@/components/CopierCompte";
import { declarerPaiement } from "./declarationPaiement";

export const revalidate = 0;

const LIBELLES: Record<string, { texte: string; classe: string }> = {
  payé: { texte: "Payé", classe: "text-success" },
  en_attente: { texte: "En attente", classe: "text-ink/50" },
  raté: { texte: "Raté", classe: "text-danger" },
};

const MESSAGES_DECLARATION: Record<string, string> = {
  ok: "Merci ! Ton paiement a été déclaré. Il sera vérifié.",
  deja: "Ton paiement de ce mois est déjà déclaré.",
};

// Premier jour du mois en cours (AAAA-MM-01).
function moisCourant() {
  const maintenant = new Date();
  const mois = String(maintenant.getUTCMonth() + 1).padStart(2, "0");
  return `${maintenant.getUTCFullYear()}-${mois}-01`;
}

export default async function Abonnement({
  searchParams,
}: {
  searchParams: Promise<{ declaration?: string; detail?: string }>;
}) {
  const { declaration, detail } = await searchParams;

  // Compte de paiement : lu dans la variable d'environnement COMPTE_PAIEMENT
  // (Vercel → Settings → Environment Variables), jamais écrit dans le code.
  // Sans le préfixe NEXT_PUBLIC_, elle reste côté serveur. Tant qu'elle est
  // vide, le bloc « Payer mon abonnement » n'apparaît pas.
  const comptePaiement = process.env.COMPTE_PAIEMENT ?? "";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/abonnement");

  const [{ data: abonnements }, { data: declarationMois }] = await Promise.all([
    supabase
      .from("abonnements")
      .select("id, mois, statut, montant, date_paiement")
      .eq("profile_id", user.id)
      .order("mois", { ascending: false }),
    supabase
      .from("declarations_paiement")
      .select("statut, reference, created_at")
      .eq("profile_id", user.id)
      .eq("mois", moisCourant())
      .maybeSingle(),
  ]);

  const peutDeclarer = !declarationMois || declarationMois.statut === "refusé";

  return (
    // Plein écran : plus de conteneur max-w-2xl centré. Le SiteHeader est
    // sorti du <main> pour s'étendre sur toute la largeur.
    <div className="w-full min-h-screen bg-paper flex flex-col">
      <SiteHeader />

      <main className="flex-1 px-4 pt-6 pb-24">

      <Link href="/compte" className="text-sm text-ink/50 hover:text-accent transition-colors">
        ← Mon compte
      </Link>
      <h1 className="font-display text-3xl mt-3 mb-8">Mon abonnement</h1>

      {comptePaiement && (
        <section className="bg-surface border border-surface-border rounded-xl p-4 mb-8">
          <h2 className="text-[17px] font-bold mb-1">Payer mon abonnement</h2>
          <p className="text-sm text-ink/60 mb-3.5">
            Envoie le montant de ton abonnement sur le compte ci-dessous, puis déclare ton
            paiement.
          </p>
          <CopierCompte compte={comptePaiement} />

          {/* Déclaration du paiement du mois */}
          <div className="mt-4 pt-4 border-t border-surface-border">
            {declarationMois?.statut === "validé" && (
              <p className="text-sm font-semibold text-success">
                ✓ Ton paiement de ce mois est validé.
              </p>
            )}

            {declarationMois?.statut === "en_attente" && (
              <p className="text-sm text-ink/70">
                Paiement déclaré le{" "}
                {new Date(declarationMois.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "long",
                })}
                {declarationMois.reference ? ` (réf. ${declarationMois.reference})` : ""} :
                en attente de vérification.
              </p>
            )}

            {declarationMois?.statut === "refusé" && (
              <p className="text-sm text-danger mb-3">
                Ta dernière déclaration a été refusée. Vérifie ton paiement, puis déclare-le à
                nouveau.
              </p>
            )}

            {peutDeclarer && (
              <form action={declarerPaiement} className="space-y-2.5">
                <input
                  type="text"
                  name="reference"
                  maxLength={100}
                  placeholder="Référence de la transaction (facultatif)"
                  autoCapitalize="none"
                  className="w-full bg-paper border border-surface-border rounded-xl px-4 py-3 text-sm outline-none focus:border-accent"
                />
                <button
                  type="submit"
                  className="w-full rounded-full bg-accent text-accent-ink font-semibold text-sm py-3"
                >
                  J&rsquo;ai payé
                </button>
              </form>
            )}

            {declaration && (
              <p
                className={`text-xs mt-2.5 font-semibold ${
                  declaration === "erreur" ? "text-danger" : "text-success"
                }`}
              >
                {declaration === "erreur"
                  ? detail ?? "Impossible d'enregistrer la déclaration pour le moment."
                  : MESSAGES_DECLARATION[declaration]}
              </p>
            )}
          </div>
        </section>
      )}

      {!comptePaiement && (
        <p className="text-sm text-ink/50 mb-8">
          Le paiement de l&rsquo;abonnement n&rsquo;est pas encore disponible.
        </p>
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
    </div>
  );
}
