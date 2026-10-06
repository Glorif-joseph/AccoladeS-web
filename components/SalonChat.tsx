"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import EmojiPicker from "./EmojiPicker";
import EnregistreurVocal from "./EnregistreurVocal";
import VocalPlayer from "./VocalPlayer";

const BUCKET = "messages";
const TAILLE_MAX = 5 * 1024 * 1024; // 5 Mo

type Message = {
  id: string;
  expediteur_id: string;
  contenu: string;
  created_at: string;
  image_url?: string | null;
  audio_url?: string | null;
  audio_duree?: number | null;
  pseudoExpediteur?: string;
  photoExpediteur?: string | null;
  statutExpediteur?: string | null;
};

// "Ambassadeur" (ou "Ambassadrice"), quelle que soit la casse.
function estAmbassadeur(statut?: string | null) {
  return !!statut && statut.trim().toLowerCase().startsWith("ambassad");
}

// Retrouve le chemin d'un fichier dans le bucket à partir de son adresse
// publique (pour supprimer l'image avec le message).
function cheminDansBucket(url: string) {
  const repere = `/object/public/${BUCKET}/`;
  const i = url.indexOf(repere);
  if (i === -1) return null;
  return decodeURIComponent(url.slice(i + repere.length).split("?")[0]);
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
  const [image, setImage] = useState<File | null>(null);
  const [apercu, setApercu] = useState<string | null>(null);
  const [envoi, setEnvoi] = useState(false);
  const [vocalEnCours, setVocalEnCours] = useState(false);
  const finListe = useRef<HTMLDivElement>(null);
  const champTexte = useRef<HTMLTextAreaElement>(null);
  const champFichier = useRef<HTMLInputElement>(null);

  useEffect(() => {
    finListe.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Libère l'aperçu local quand on change d'image ou qu'on quitte la page.
  useEffect(() => {
    return () => {
      if (apercu) URL.revokeObjectURL(apercu);
    };
  }, [apercu]);

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
      // Un message supprimé disparaît aussi chez les autres membres.
      // (Supabase n'envoie que l'identifiant du message supprimé.)
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "messages_groupe" },
        (payload) => {
          const id = (payload.old as { id?: string }).id;
          if (id) setMessages((prev) => prev.filter((m) => m.id !== id));
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

  async function envoyer() {
    if ((!texte.trim() && !image) || !utilisateurId || envoi) return;

    const contenu = texte.trim();
    const fichier = image;
    setTexte("");
    setImage(null);
    setApercu(null);
    setEnvoi(true);

    const supabase = createClient();
    let imageUrl: string | null = null;

    if (fichier) {
      const extension = fichier.name.split(".").pop() || "jpg";
      const chemin = `${utilisateurId}/salon-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2)}.${extension}`;

      const { error: erreurEnvoi } = await supabase.storage
        .from(BUCKET)
        .upload(chemin, fichier, { contentType: fichier.type });

      if (erreurEnvoi) {
        // On remet le message tel quel pour pouvoir réessayer.
        alert(`Erreur d'envoi de l'image : ${erreurEnvoi.message}`);
        setTexte(contenu);
        setImage(fichier);
        setApercu(URL.createObjectURL(fichier));
        setEnvoi(false);
        return;
      }

      imageUrl = supabase.storage.from(BUCKET).getPublicUrl(chemin).data.publicUrl;
    }

    const { error } = await supabase
      .from("messages_groupe")
      .insert({ expediteur_id: utilisateurId, contenu, image_url: imageUrl });

    if (error) alert(error.message);
    setEnvoi(false);
  }

  // Enregistre un message vocal déjà envoyé dans le stockage.
  async function envoyerVocal(audioUrl: string, duree: number) {
    if (!utilisateurId) return;
    const supabase = createClient();
    const { error } = await supabase.from("messages_groupe").insert({
      expediteur_id: utilisateurId,
      contenu: "",
      audio_url: audioUrl,
      audio_duree: duree,
    });
    if (error) alert(error.message);
  }

  // Supprime un de TES messages : retrait immédiat à l'écran, puis
  // suppression en base (et de l'image associée). Si la base refuse (ou ne
  // supprime rien), le message revient à sa place avec un message d'erreur.
  async function supprimer(message: Message) {
    if (!utilisateurId || message.expediteur_id !== utilisateurId) return;
    if (!confirm("Supprimer ce message ?")) return;

    setMessages((prev) => prev.filter((m) => m.id !== message.id));

    const supabase = createClient();
    const { data, error } = await supabase
      .from("messages_groupe")
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

    // Supprime aussi l'image et/ou le vocal du stockage.
    const chemins = [message.image_url, message.audio_url]
      .map((u) => (u ? cheminDansBucket(u) : null))
      .filter((c): c is string => !!c);
    if (chemins.length > 0) await supabase.storage.from(BUCKET).remove(chemins);
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
            <div
              key={m.id}
              className={`flex items-end gap-2 ${moi ? "justify-end" : "justify-start"}`}
            >
              {moi && (
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

                {m.audio_url && (
                  <div className={m.contenu ? "mb-1.5" : ""}>
                    <VocalPlayer url={m.audio_url} duree={m.audio_duree} />
                  </div>
                )}

                {m.contenu && (
                  <p className="text-sm whitespace-pre-wrap break-words">{m.contenu}</p>
                )}
              </div>
            </div>
          );
        })}
        <div ref={finListe} />
      </div>

      <div className="border-t border-surface-border shrink-0">
        {apercu && (
          <div className="px-3 pt-3 flex">
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

        <div className="flex items-end gap-1 p-2.5">
          {!vocalEnCours && (
            <>
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
            </>
          )}

          {utilisateurId && (
            <EnregistreurVocal
              utilisateurId={utilisateurId}
              prefixe="salon"
              onEnvoye={envoyerVocal}
              onEtat={setVocalEnCours}
            />
          )}

          {!vocalEnCours && (
            <>
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
                className="flex-1 min-w-0 border border-surface-border rounded-[20px] px-3.5 py-2.5 text-sm outline-none focus:border-accent resize-none max-h-24"
              />
              <button
                onClick={envoyer}
                disabled={envoi}
                className="w-10 h-10 rounded-full bg-anthracite text-paper flex items-center justify-center shrink-0 ml-1 disabled:opacity-60"
                aria-label="Envoyer"
              >
                {envoi ? "…" : "➤"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
