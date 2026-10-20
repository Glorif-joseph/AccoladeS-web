"use client";

import { useState } from "react";

// Affiche un identifiant de compte (ex. celui des paiements d'abonnement) avec
// un bouton « Copier » : sur téléphone, ça évite de le recopier à la main.
export default function CopierCompte({ compte }: { compte: string }) {
  const [copie, setCopie] = useState(false);

  async function copier() {
    try {
      await navigator.clipboard.writeText(compte);
      setCopie(true);
      setTimeout(() => setCopie(false), 2000);
    } catch {
      // Presse-papier indisponible : on sélectionne le texte pour que le
      // membre puisse le copier lui-même.
      alert(`Copie ce compte : ${compte}`);
    }
  }

  return (
    <div className="flex items-center gap-2.5 bg-paper border border-surface-border rounded-lg pl-3.5 pr-1.5 py-1.5">
      <span className="flex-1 min-w-0 text-[15px] font-semibold break-all select-all">
        {compte}
      </span>
      <button
        type="button"
        onClick={copier}
        className="shrink-0 rounded-full bg-accent text-accent-ink text-xs font-semibold px-3.5 py-2"
      >
        {copie ? "Copié ✓" : "Copier"}
      </button>
    </div>
  );
}
