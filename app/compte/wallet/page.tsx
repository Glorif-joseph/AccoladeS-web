import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AjouterFondsForm from "@/components/AjouterFondsForm";
import SiteHeader from "@/components/SiteHeader";

export const revalidate = 0;

const LIBELLES_TYPE: Record<string, string> = {
  deposit: "Dépôt",
  purchase: "Achat",
  sale: "Vente",
  commission: "Commission",
  bonus: "Bonus",
  withdrawal: "Retrait",
  refund: "Remboursement",
  subscription: "Abonnement",
  adjustment: "Ajustement",
};

const LIBELLES_STATUT: Record<string, string> = {
  pending: "En attente",
  processing: "En cours",
  completed: "Terminé",
  failed: "Échoué",
  cancelled: "Annulé",
  reversed: "Annulé (remboursé)",
};

export default async function Wallet() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/connexion?redirect=/compte/wallet");

  const { data: wallet } = await supabase
    .from("wallets")
    .select("balance, available_balance, pending_balance, currency")
    .eq("user_id", user.id)
    .maybeSingle();

  const { data: transactions } = await supabase
    .from("wallet_transactions")
    .select("id, type, amount, currency, status, description, created_at")
    .eq("user_id", user.id)
    .order("created_at", { ascending: false })
    .limit(30);

  const devise = wallet?.currency ?? "USD";

  return (
    <main className="min-h-screen max-w-3xl mx-auto px-8 py-10">
      <SiteHeader />

      <h1 className="font-display text-3xl mb-8">Mon wallet</h1>

      <div className="grid sm:grid-cols-3 gap-6 mb-10">
        <div className="bg-accent text-paper rounded-xl p-6">
          <p className="text-paper/60 text-sm">Solde total</p>
          <p className="font-display text-3xl mt-1">
            {(wallet?.balance ?? 0).toFixed(2)} {devise}
          </p>
        </div>
        <div className="border border-ink/10 rounded-xl p-6">
          <p className="text-ink/50 text-sm">Disponible</p>
          <p className="font-display text-2xl mt-1">
            {(wallet?.available_balance ?? 0).toFixed(2)} {devise}
          </p>
        </div>
        <div className="border border-ink/10 rounded-xl p-6">
          <p className="text-ink/50 text-sm">En attente</p>
          <p className="font-display text-2xl mt-1">
            {(wallet?.pending_balance ?? 0).toFixed(2)} {devise}
          </p>
        </div>
      </div>

      <section className="mb-16">
        <h2 className="font-display text-xl mb-4">Ajouter des fonds</h2>
        <AjouterFondsForm devise={devise} />
        <p className="text-xs text-ink/40 mt-2">
          Paiement sécurisé via LeekPay — même prestataire que dans l&rsquo;app mobile.
        </p>
      </section>

      <section>
        <h2 className="font-display text-xl mb-4">Historique</h2>
        {transactions && transactions.length === 0 && (
          <p className="text-ink/50 text-sm">Aucune transaction pour l&rsquo;instant.</p>
        )}
        <ul className="divide-y divide-ink/10">
          {transactions?.map((t) => (
            <li key={t.id} className="flex items-center justify-between py-3 text-sm">
              <div>
                <p>{LIBELLES_TYPE[t.type] ?? t.type}</p>
                {t.description && <p className="text-ink/50 text-xs">{t.description}</p>}
                <p className="text-ink/40 text-xs">
                  {new Date(t.created_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                  })}
                </p>
              </div>
              <div className="text-right">
                <p
                  className={
                    ["deposit", "sale", "bonus", "refund"].includes(t.type)
                      ? "text-accent"
                      : "text-ink"
                  }
                >
                  {["deposit", "sale", "bonus", "refund"].includes(t.type) ? "+" : "-"}
                  {t.amount} {t.currency}
                </p>
                <p className="text-ink/40 text-xs">
                  {LIBELLES_STATUT[t.status] ?? t.status}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
