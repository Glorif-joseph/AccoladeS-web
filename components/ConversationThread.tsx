"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "./EmojiPicker";

const BUCKET = "messages";
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

type Message = {
  id: string;
  contenu: string;
  created_at: string;
  expediteur_id: string;
  image_url?: string | null;
};

// Retrouve le chemin d'un fichier dans le bucket à partir de son adresse
// publique (pour supprimer l'image avec le message).
function cheminDansBucket(url: string) {
  const repere = `/object/public/${BUCKET}/`;
  const i = url.indexOf(repere);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + repere.length).split("?")[0]);
}

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
  const [image, setImage] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const finRef = useRef<HTMLDivElement>(null);
  const champTexte = useRef<HTMLInputElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

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

  // Libère l'aperçu local quand on change d'image ou qu'on quitte la page.
  useEffect(() => {
    return () => {
      if (apercu) URL.revokeObjectURL(apercu);
    };
  }, [apercu]);

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

  function choisirImage(e: React.ChangeEvent<HTMLInputElement>) {
    const fichier = e.target.files?.[0];
    e.target.value = "";
    if (!fichier) return;

    if (!fichier.type.startsWith("image/")) {
      alert("Choisis une image.");
      return;
    }
    if (fichier.size > TAILLE_MAX) {
      alert("L'image est trop lourde (5 Mo maximum).");
      return;
    }

    setImage(fichier);
    setApercu(URL.createObjectURL(fichier));
  }

  function retirerImage() {
    setImage(null);
    setApercu(null);
  }

  async function envoyer(e: React.FormEvent) {
    e.preventDefault();
    if ((!contenu.trim() && !image) || envoi) return;

    const texte = contenu.trim();
    const fichier = image;
    setContenu("");
    setImage(null);
    setApercu(null);
    setEnvoi(true);

    const supabase = createClient();
    let imageUrl: string | null = null;

    if (fichier) {
      const extension = fichier.name.split(".").pop() || "jpg";
      const chemin = `${utilisateurId}/dm-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: erreurEnvoi } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, fichier, { contentType: fichier.type });

      if (erreurEnvoi) {
        // On remet le message tel quel pour pouvoir réessayer.
        alert(`Erreur d'envoi de l'image : ${erreurEnvoi.message}`);
        setContenu(texte);
        setImage(fichier);
        setApercu(URL.createObjectURL(fichier));
        setEnvoi(false);
        return;
      }

      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
    }

    const { data, error } = await supabase
      .from("messages_prives")
      .insert({
        expediteur_id: utilisateurId,
        destinataire_id: autreId,
        contenu: texte,
        image_url: imageUrl,
      })
      .select("id, contenu, created_at, expediteur_id, image_url")
      .single();

    if (error) alert(error.message);
    if (data) {
      setMessages((prev) => [...prev, data]);
    }
    setEnvoi(false);
  }

  // Supprime un de TES messages : retrait immédiat à l'écran, puis
  // suppression en base (et de l'image associée). Si la base refuse (ou ne
  // supprime rien), le message revient à sa place avec un message d'erreur.
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
      return;
    }

    if (message.image_url) {
      const chemin = cheminDansBucket(message.image_url);
      if (chemin) await supabase.storage.from(BUCKET).remove([chemin]);
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
                  ✕
                </button>
              )}

              <div
                className={`rounded-2xl px-4 py-2 max-w-[80%] text-sm break-words ${
                  estMoi
                    ? "bg-accent text-paper"
                    : "bg-paper border border-surface-border text-ink"
                }`}
              >
                {m.image_url && (
                  <a
                    href={m.image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`block ${m.contenu ? "mb-1.5" : ""}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={m.image_url}
                      alt="Image envoyée"
                      loading="lazy"
                      className="w-60 max-w-full h-auto max-h-72 rounded-xl object-cover"
                    />
                  </a>
                )}

                {m.contenu && <p className="whitespace-pre-wrap">{m.contenu}</p>}
              </div>
            </div>
          );
        })}
        <div ref={finRef} />
      </div>

      <div className="bg-paper border-t border-surface-border">
        {apercu && (
          <div className="px-4 pt-3 flex">
            <div className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={apercu} alt="Aperçu" className="h-20 w-20 rounded-xl object-cover" />
              <button
                type="button"
                onClick={retirerImage}
                aria-label="Retirer l'image"
                className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-anthracite text-paper text-xs flex items-center justify-center"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        <form
          onSubmit={envoyer}
          className="px-4 py-3 flex items-center gap-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
        >
          <EmojiPicker onChoisir={insererEmoji} />

          <input
            ref={champFichier}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={choisirImage}
          />
          <button
            type="button"
            onClick={() => champFichier.current?.click()}
            aria-label="Joindre une image"
            className="shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-xl hover:bg-surface transition-colors"
          >
            📷
          </button>

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
            disabled={envoi}
            className="rounded-full bg-accent text-ink px-5 py-2.5 text-sm font-medium hover:bg-accent-light transition-colors disabled:opacity-60"
          >
            {envoi ? "…" : "Envoyer"}
          </button>
        </form>
      </div>
    </div>
  );
}
