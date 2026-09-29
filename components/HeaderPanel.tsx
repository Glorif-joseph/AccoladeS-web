"use client";

import Link from "next/link";
import { useState } from "react";

// Reprend exactement LIENS dans components/AppHeader.tsx (même libellés,
// même ordre — mis à jour avec la version la plus récente : Wallet a été
// retiré du menu, "Créer ma boutique" et "Devenir ambassadeur" ajoutés).
// Correspondance des routes app → site :
//   Produits            → /produits
//   Profil               → /compte (pas de route "/profil" côté site)
//   Créer ma boutique    → /plateformes
//   Devenir ambassadeur  → /ambassadeur
//   Validations          → /compte/validation
//   Membres              → /membres
//   Messages             → /compte/messages
//   Paramètres           → pas encore construit côté site
// Les non construits sont grisés/désactivés plutôt que masqués, pour que
// le menu ait la même forme que dans l'app même si tout n'est pas encore
// branché derrière.
const LIENS: { label: string; href: string | null }[] = [
  { label: "Produits", href: "/produits" },
  { label: "Profil", href: "/compte" },
  { label: "Créer ma boutique", href: "/plateformes" },
  { label: "Devenir ambassadeur", href: "/ambassadeur" },
  { label: "Validations", href: "/compte/validation" },
  { label: "Membres", href: "/membres" },
  { label: "Messages", href: "/compte/messages" },
  { label: "Paramètres", href: null },
];

export default function HeaderPanel({
  connecte,
  onDeconnexion,
}: {
  connecte: boolean;
  onDeconnexion?: () => Promise<void>;
}) {
  const [ouvert, setOuvert] = useState(false);

  return (
    <>
      {/* Bouton hamburger — trois barres turquoise, identique à AppHeader */}
      <button
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir le menu"
        className="flex flex-col items-end gap-[5px] w-8 h-8 justify-center"
      >
        <span className="w-[22px] h-[2px] bg-accent rounded-full" />
        <span className="w-[22px] h-[2px] bg-accent rounded-full" />
        <span className="w-[22px] h-[2px] bg-accent rounded-full" />
      </button>

      {/* Fond + panneau, avec transition CSS plutôt que l'Animated de RN */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-200 ${
          ouvert ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        role="dialog"
        aria-modal="true"
      >
        <button
          aria-label="Fermer le menu"
          onClick={() => setOuvert(false)}
          className="absolute inset-0 bg-black/45"
        />
        <div
          className={`absolute top-0 right-0 h-full w-[280px] max-w-[75vw] bg-anthracite border-l border-bordure px-5 pt-8 flex flex-col transition-transform duration-200 ${
            ouvert ? "translate-x-0" : "translate-x-full"
          }`}
        >
          <p className="text-paper text-lg font-medium mb-5">Menu</p>

          <nav className="flex-1 overflow-y-auto">
            {LIENS.map((lien) =>
              lien.href ? (
                <Link
                  key={lien.label}
                  href={lien.href}
                  onClick={() => setOuvert(false)}
                  className="block py-3.5 border-b border-bordure text-paper text-[15px]"
                >
                  {lien.label}
                </Link>
              ) : (
                <span
                  key={lien.label}
                  aria-disabled="true"
                  title="Pas encore disponible sur le site"
                  className="block py-3.5 border-b border-bordure text-paper/35 text-[15px]"
                >
                  {lien.label}
                </span>
              )
            )}
          </nav>

          <div className="py-4">
            {connecte ? (
              <button
                onClick={() => {
                  setOuvert(false);
                  onDeconnexion?.();
                }}
                className="text-danger text-[15px] font-semibold"
              >
                Se déconnecter
              </button>
            ) : (
              <Link
                href="/connexion"
                onClick={() => setOuvert(false)}
                className="text-accent text-[15px] font-semibold"
              >
                Connexion
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
