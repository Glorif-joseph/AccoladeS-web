"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import PalierBadge from "./PalierBadge";
import SuivreBouton from "./SuivreBouton";

type Membre = {
  id: string;
  pseudo: string;
  pays: string | null;
  statut_actuel: string | null;
  photo_url: string | null;
};

export default function MembresListe({ membres }: { membres: Membre[] }) {
  const [recherche, setRecherche] = useState("");

  const filtres = membres.filter((m) =>
    m.pseudo?.toLowerCase().includes(recherche.toLowerCase())
  );

  return (
    <>
      <input
        type="text"
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher un pseudo..."
        autoCapitalize="none"
        className="w-full border border-surface-border rounded-lg p-2.5 mb-4 text-sm outline-none focus:border-accent"
      />

      {filtres.length === 0 && (
        <p className="text-center text-muted mt-10">Aucun membre trouvé.</p>
      )}

      <div className="space-y-2.5">
        {filtres.map((m) => (
          <div
            key={m.id}
            className="flex items-center gap-3 bg-paper rounded-xl border border-surface-border p-3"
          >
            <Link href={`/membres/${m.id}`} className="flex items-center gap-3 flex-1 min-w-0">
              {m.photo_url ? (
                <Image
                  src={m.photo_url}
                  alt=""
                  width={44}
                  height={44}
                  className="rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-11 h-11 rounded-full bg-anthracite flex items-center justify-center text-accent font-bold shrink-0">
                  {m.pseudo?.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-[15px] font-semibold truncate">{m.pseudo}</p>
                {m.pays && <p className="text-[13px] text-muted mt-0.5">{m.pays}</p>}
              </div>
            </Link>

            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <PalierBadge statut={m.statut_actuel ?? "Nouveau"} />
              <SuivreBouton suiviId={m.id} />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
