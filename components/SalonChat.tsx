"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "./EmojiPicker";

type Message = {
  id: string;
  expediteur_id: string;
  contenu: string;
  created_at: string;
  pseudoExpediteur?: string;
  photoExpediteur?: string | null;
  statutExpediteur?: string | null;
};

// "Ambassadeur" (ou "Ambassadrice"), quelle que soit la casse.
function estAmbassadeur(statut?: string | null) {
  return !!statut && statut.trim().toLowerCase().startsWith("ambassad");
}

export default function SalonChat({
  messagesInitiaux,
  utilisateurId,
}: {
  messagesInitiaux: Message[];
  utilisateurId: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(messagesInitiaux);
  const [texte, setTexte] = useState("");
  const finListe = useRef<HTMLDivElement>(null);
  const champTexte = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    finListe.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  useEffect(() => {
    const supabase = createClient();
    const canal = supabase
      .channel("salon-general")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_groupe" },
        async (payload) => {
          const nouveau = payload.new as Message;
          const { data: profil } = await supabase
            .from("profiles")
            .select("pseudo, statut_actuel")
            .eq("id", nouveau.expediteur_id)
            .single();
          setMessages((prev) => [
            ...prev,
            {
              ...nouveau,
              pseudoExpediteur: profil?.pseudo ?? "Membre",
              statutExpediteur: profil?.statut_actuel ?? null,
            },
          ]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(canal);
    };
  }, []);

  // Insère l'émoji à la position du curseur (ou remplace la sélection).
  function insererEmoji(emoji: string) {
    const champ = champTexte.current;
    const debut = champ?.selectionStart ?? texte.length;
    const fin = champ?.selectionEnd ?? texte.length;
    setTexte(texte.slice(0, debut) + emoji + texte.slice(fin));

    requestAnimationFrame(() => {
      const position = debut + emoji.length;
      champ?.setSelectionRange(position, position);
    });
  }

  async function envoyer() {
    if (!texte.trim() || !utilisateurId) return;
    const contenu = texte.trim();
    setTexte("");

    const supabase = createClient();
    const { error } = await supabase
      .from("messages_groupe")
      .insert({ expediteur_id: utilisateurId, contenu });

    if (error) alert(error.message);
  }

  return (
    <div className="flex-1 flex flex-col min-h-0">
      <div className="py-4 border-b border-surface-border shrink-0">
        <p className="text-[17px] font-bold text-center">💬 Salon général</p>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {messages.map((m) => {
          const moi = m.expediteur_id === utilisateurId;
          const ambassadeur = estAmbassadeur(m.statutExpediteur);
          return (
            <div key={m.id} className={`flex ${moi ? "justify-end" : "justify-start"}`}>
              <div
                className={`max-w-[78%] px-3.5 py-2.5 rounded-2xl ${
                  moi
                    ? "bg-anthracite text-paper rounded-br-sm"
                    : "bg-surface text-ink rounded-bl-sm"
                }`}
              >
                {/* Pseudo : affiché pour les autres membres, et aussi pour
                    toi si tu es ambassadeur (pour y voir le badge rouge). */}
                {(!moi || ambassadeur) && (
                  <p
                    className={`flex items-center gap-1.5 text-[11px] font-bold mb-0.5 ${
                      moi ? "text-paper/70" : "text-ink/60"
                    }`}
                  >
                    <span>{m.pseudoExpediteur}</span>
                    {ambassadeur && (
                      <span
                        title="Ambassadeur"
                        className="inline-block w-2.5 h-2.5 rounded-full bg-danger shrink-0"
                      >
                        <span className="sr-only">Ambassadeur</span>
                      </span>
                    )}
                  </p>
                )}
                <p className="text-sm whitespace-pre-wrap break-words">{m.contenu}</p>
              </div>
            </div>
          );
        })}
        <div ref={finListe} />
      </div>

      <div className="flex items-end gap-1 p-2.5 border-t border-surface-border shrink-0">
        <EmojiPicker onChoisir={insererEmoji} />
        <textarea
          ref={champTexte}
          value={texte}
          onChange={(e) => setTexte(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              envoyer();
            }
          }}
          placeholder="Écrire dans le salon..."
          rows={1}
          className="flex-1 border border-surface-border rounded-[20px] px-3.5 py-2.5 text-sm outline-none focus:border-accent resize-none max-h-24"
        />
        <button
          onClick={envoyer}
          className="w-10 h-10 rounded-full bg-anthracite text-paper flex items-center justify-center shrink-0 ml-1"
          aria-label="Envoyer"
        >
          ➤
        </button>
      </div>
    </div>
  );
}
