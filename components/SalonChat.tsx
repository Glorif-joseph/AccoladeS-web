"use client";

import { createClient } from "@/lib/supabase/client";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  contenu: string;
  created_at: string;
  expediteur_id: string;
  pseudo: string;
};

export default function SalonChat({
  messagesInitiaux,
  utilisateurId,
  pseudoUtilisateur,
}: {
  messagesInitiaux: Message[];
  utilisateurId: string | null;
  pseudoUtilisateur: string | null;
}) {
  const [messages, setMessages] = useState<Message[]>(messagesInitiaux);
  const [contenu, setContenu] = useState("");
  const finRef = useRef<HTMLDivElement>(null);
  const pseudoCache = useRef<Map<string, string>>(
    new Map(messagesInitiaux.map((m) => [m.expediteur_id, m.pseudo]))
  );

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("salon-realtime")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages_groupe" },
        async (payload) => {
          const nouveau = payload.new as Omit<Message, "pseudo">;

          let pseudo = pseudoCache.current.get(nouveau.expediteur_id);
          if (!pseudo) {
            const { data } = await supabase
              .from("profiles")
              .select("pseudo")
              .eq("id", nouveau.expediteur_id)
              .single();
            pseudo = data?.pseudo ?? "Membre AccoladeS";
pseudoCache.current.set(
  nouveau.expediteur_id,
  pseudo ?? "Membre AccoladeS"
);          }

          setMessages((prev) => [...prev, { ...nouveau, pseudo: pseudo! }]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    finRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if (!contenu.trim() || !utilisateurId) return;

    const supabase = createClient();
    const texte = contenu.trim();
    setContenu("");

    await supabase.from("messages_groupe").insert({
      expediteur_id: utilisateurId,
      contenu: texte,
    });
    // Pas d'ajout optimiste manuel : l'insertion déclenche l'événement
    // realtime ci-dessus, reçu aussi par l'auteur du message.
  }

  return (
    <div className="flex flex-col h-[70vh] border border-ink/10 rounded-2xl overflow-hidden">
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {messages.map((m) => (
          <div key={m.id} className={m.expediteur_id === utilisateurId ? "text-right" : ""}>
            <p className="text-xs text-ink/40 mb-1">
              {m.expediteur_id === utilisateurId ? "Toi" : m.pseudo}
            </p>
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

      <div className="border-t border-ink/10 p-4">
        {utilisateurId ? (
          <form onSubmit={envoyer} className="flex gap-3">
            <input
              type="text"
              value={contenu}
              onChange={(e) => setContenu(e.target.value)}
              placeholder="Écrire dans le salon..."
              className="flex-1 border-b-2 border-ink/20 focus:border-accent outline-none bg-transparent py-2 transition-colors"
            />
            <button
              type="submit"
              className="rounded-full bg-accent text-ink px-5 py-2 text-sm font-medium hover:bg-accent-light transition-colors"
            >
              Envoyer
            </button>
          </form>
        ) : (
          <p className="text-sm text-ink/50 text-center">
            <a href="/connexion?redirect=/salon" className="text-accent underline underline-offset-4">
              Connecte-toi
            </a>{" "}
            pour écrire dans le salon.
          </p>
        )}
      </div>
    </div>
  );
}
