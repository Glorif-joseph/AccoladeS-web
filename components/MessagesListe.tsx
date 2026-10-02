"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";

type Conversation = {
  autreId: string;
  autrePseudo: string;
  autrePhoto: string | null;
  dernierMessage: string;
  nonLu: boolean;
};

export default function MessagesListe({
  conversations,
  nbNouveauxSalon,
}: {
  conversations: Conversation[];
  nbNouveauxSalon: number;
}) {
  const [recherche, setRecherche] = useState("");

  const filtrees = recherche.trim()
    ? conversations.filter((c) =>
        c.autrePseudo.toLowerCase().includes(recherche.toLowerCase())
      )
    : conversations;

  return (
    <>
      <Link
        href="/salon"
        className="flex items-center gap-3 bg-anthracite rounded-xl p-3.5 mb-4"
      >
        <span className="text-2xl">💬</span>
        <div className="flex-1">
          <p className="text-paper font-bold text-[15px]">Salon général</p>
          <p className="text-[#cccccc] text-xs mt-0.5">
            Discussion ouverte à tous les membres
          </p>
        </div>
        {nbNouveauxSalon > 0 && (
          <span className="bg-danger text-white text-[11px] font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1.5">
            {nbNouveauxSalon > 9 ? "9+" : nbNouveauxSalon}
          </span>
        )}
      </Link>

      <input
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
        placeholder="Rechercher une conversation..."
        className="w-full bg-surface border border-accent rounded-full px-4 py-2.5 text-sm mb-6 outline-none"
      />

      <p className="text-sm font-bold text-ink/70 mb-2">Conversations privées</p>

      {filtrees.length === 0 && (
        <p className="text-muted text-sm">
          {recherche
            ? "Aucune conversation ne correspond."
            : "Aucune conversation. Va sur l'annuaire des membres pour en démarrer une."}
        </p>
      )}

      <div className="space-y-2.5">
        {filtrees.map((c) => (
          <Link
            key={c.autreId}
            href={`/compte/messages/${c.autreId}`}
            className={`flex items-center gap-3 rounded-xl p-3 border ${
              c.nonLu
                ? "border-accent bg-accent/5"
                : "border-surface-border bg-paper"
            }`}
          >
            {c.autrePhoto ? (
              <Image
                src={c.autrePhoto}
                alt=""
                width={44}
                height={44}
                className="rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-full bg-anthracite flex items-center justify-center text-accent font-bold shrink-0">
                {c.autrePseudo.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className={`text-[15px] ${c.nonLu ? "font-extrabold" : "font-semibold"}`}>
                {c.autrePseudo}
              </p>
              <p
                className={`text-[13px] truncate ${
                  c.nonLu ? "text-ink font-semibold" : "text-muted"
                }`}
              >
                {c.dernierMessage}
              </p>
            </div>
            {c.nonLu && <span className="w-2.5 h-2.5 rounded-full bg-accent shrink-0" />}
          </Link>
        ))}
      </div>
    </>
  );
}
