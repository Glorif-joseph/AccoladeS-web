"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function AjouterFondsForm({ devise }: { devise: string }) {
  const [montant, setMontant] = useState("");
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);

    const valeur = Number(montant);
    if (!valeur || valeur <= 0) {
      setErreur("Indique un montant valide.");
      return;
    }

    setChargement(true);
    const supabase = createClient();

    // Appelle l'edge function `create-deposit` déjà déployée côté Supabase
    // (même flux que l'app mobile) : elle crée le wallet si besoin, ouvre
    // un paiement LeekPay et enregistre le dépôt en `pending`. Le webhook
    // `leekpay-webhook`, également déjà déployé, confirme le paiement et
    // crédite le solde — rien de tout ça n'est ré-implémenté ici.
    const { data, error } = await supabase.functions.invoke("create-deposit", {
      body: { amount: valeur, currency: devise },
    });

    if (error || data?.error) {
      setErreur(data?.error ?? "Impossible de lancer le paiement pour le moment.");
      setChargement(false);
      return;
    }

    if (data?.payment_url) {
      window.location.href = data.payment_url;
    } else {
      setErreur("Réponse inattendue du service de paiement.");
      setChargement(false);
    }
  }

  return (
    <form onSubmit={soumettre} className="flex flex-wrap items-end gap-4 border border-ink/10 rounded-xl p-6">
      <label className="block">
        <span className="text-sm text-ink/70">Montant ({devise})</span>
        <input
          type="number"
          min="1"
          step="0.01"
          value={montant}
          onChange={(e) => setMontant(e.target.value)}
          className="mt-1 w-40 border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2"
        />
      </label>
      <button
        type="submit"
        disabled={chargement}
        className="rounded-full bg-accent text-ink px-6 py-2 text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-60"
      >
        {chargement ? "Redirection..." : "Ajouter des fonds"}
      </button>
      {erreur && <p className="w-full text-sm text-danger">{erreur}</p>}
    </form>
  );
}
