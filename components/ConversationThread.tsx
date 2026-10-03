"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "./EmojiPicker";

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
  const champTexte = useRef<HTMLInputElement>(null);

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
      // Quand l'interlocuteur supprime un message, il disparaît aussi ici.
      // Supabase n'accepte pas de filtre sur les suppressions et n'envoie
      // que l'identifiant : on retire simplement ce message s'il est affiché.
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages_prives" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
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

  // Insère l'émoji à la position du curseur (ou remplace la sélection).
  function insererEmoji(emoji: string) {
    const champ = champTexte.current;
    const debut = champ?.selectionStart ?? contenu.length;
    const fin = champ?.selectionEnd ?? contenu.length;
    setContenu(contenu.slice(0, debut) + emoji + contenu.slice(fin));

    requestAnimationFrame(() => {
      const position = debut + emoji.length;
      champ?.setSelectionRange(position, position);
    });
  }

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

  // Supprime un de TES messages : retrait immédiat à l'écran, puis
  // suppression en base. Si la base refuse (ou ne supprime rien), le message
  // revient à sa place avec un message d'erreur.
  async function supprimer(message: Message) {
    if (message.expediteur_id !== utilisateurId) return;
    if (!confirm("Supprimer ce message ?")) return;

    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages_prives")
      .delete()
      .eq("id", message.id)
      .eq("expediteur_id", utilisateurId)
      .select("id");

    if (error || !data || data.length === 0) {
      setMessages((prev) =>
        prev.some((m) => m.id === message.id)
          ? prev
          : [...prev, message].sort((a, b) => (a.created_at < b.created_at ? -1 : 1))
      );
      alert(error?.message ?? "Impossible de supprimer ce message.");
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
            <div
              key={m.id}
              className={`flex items-end gap-2 ${estMoi ? "justify-end" : "justify-start"}`}
            >
              {estMoi && (
                <button
                  type="button"
                  onClick={() => supprimer(m)}
                  aria-label="Supprimer ce message"
                  title="Supprimer"
                  className="shrink-0 mb-1 text-sm opacity-40 hover:opacity-100 transition-opacity"
                >
                  🗑️
                </button>
              )}
              <p
                className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm break-words whitespace-pre-wrap ${
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
        className="bg-paper border-t border-surface-border px-4 py-3 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <EmojiPicker onChoisir={insererEmoji} />
        <input
          ref={champTexte}
          type="text"
          value={contenu}
          onChange={(e) => setContenu(e.target.value)}
          placeholder="Écrire un message..."
          className="flex-1 min-w-0 bg-surface border border-accent rounded-full px-4 py-2.5 text-sm outline-none"
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
