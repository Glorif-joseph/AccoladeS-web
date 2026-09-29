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

  return (
    <div className="flex flex-col h-[65vh] border border-ink/10 rounded-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={m.expediteur_id === utilisateurId ? "text-right" : ""}>
            <p
              className={`inline-block rounded-2xl px-4 py-2 max-w-[80%] text-sm ${
                m.expediteur_id === utilisateurId
                  ? "bg-accent text-paper"
                  : "bg-accent/10 text-ink"
              }`}
            >
              {m.contenu}
            </p>
          </div>
        ))}
        <div ref={finRef} />
      </div>

      <form onSubmit={envoyer} className="border-t border-ink/10 p-4 flex gap-3">
        <input
          type="text"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
        />
        <button
          type="submit"
          className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
        >
          Envoyer
        </button>
      </form>
    </div>
  );
}
