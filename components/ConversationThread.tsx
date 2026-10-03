"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Message = {
  id: string;
  contenu: string;
  created_at: string;
  expediteur_id: string;
};

export default function ConversationThread({
  messagesInitiaux,
  utilisateurId,
  autreId,
}: {
  messagesInitiaux: Message[];
  utilisateurId: string;
  autreId: string;
}) {
  const [messages, setMessages] = useState<Message[]>(messagesInitiaux);
  const [contenu, setContenu] = useState("");
  const finRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const supabase = createClient();

    // Filtré sur "je suis le destinataire" : je reçois donc les messages
    // entrants de N'IMPORTE quel interlocuteur, filtrés ici côté client sur
    // celui de cette conversation. Mes propres envois sont ajoutés
    // directement après l'insertion (pas besoin d'attendre l'événement).
    const channel = supabase
      .channel(`dm-${autreId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages_prives",
          filter: `destinataire_id=eq.${utilisateurId}`,
        },
        (payload) => {
          const nouveau = payload.new as Message;
          if (nouveau.expediteur_id !== autreId) return;

          setMessages((prev) => [...prev, nouveau]);
          supabase.from("messages_prives").update({ lu: true }).eq("id", nouveau.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [autreId, utilisateurId]);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    const texte = contenu.trim();
    if (!texte) return;

    setContenu("");
    const supabase = createClient();

    const { data } = await supabase
      .from("messages_prives")
      .insert({ expediteur_id: utilisateurId, destinataire_id: autreId, contenu: texte })
      .select("id, contenu, created_at, expediteur_id")
      .single();

    if (data) {
      setMessages((prev) => [...prev, data]);
    }
  }

  // Plein écran : le composant remplit tout l'espace que lui laisse la page
  // (flex-1 min-h-0). La liste des messages défile à l'intérieur, la barre
  // de saisie reste collée en bas. La page parente doit donc être en
  // "h-dvh flex flex-col" (voir page.tsx de la conversation).
  return (
    <div className="flex flex-col flex-1 min-h-0 w-full bg-paper">
      <div className="flex-1 min-h-0 overflow-y-auto bg-[#f2f2f2] px-4 py-4 space-y-2.5">
        {messages.map((m) => {
          const estMoi = m.expediteur_id === utilisateurId;
          return (
            <div key={m.id} className={`flex ${estMoi ? "justify-end" : "justify-start"}`}>
              <p
                className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm break-words ${
                  estMoi
                    ? "bg-accent text-paper"
                    : "bg-paper border border-surface-border text-ink"
                }`}
              >
                {m.contenu}
              </p>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <form
        onSubmit={envoyer}
        className="bg-paper border-t border-surface-border px-4 py-3 flex items-center gap-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          type="text"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 bg-surface border border-accent rounded-full px-4 py-2.5 text-sm outline-none"
        />
        <button
          type="submit"
          className="rounded-full bg-accent text-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-light transition-colors"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
