"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Commentaire = {
  id: string;
  contenu: string;
  profiles: { pseudo: string } | { pseudo: string }[] | null;
};

export default function CommentairesModal({
  produitId,
  utilisateurId,
  onFermer,
  onNouveauCommentaire,
}: {
  produitId: string;
  utilisateurId: string | null;
  onFermer: () => void;
  onNouveauCommentaire: () => void;
}) {
  const [commentaires, setCommentaires] = useState<Commentaire[]>([]);
  const [texte, setTexte] = useState("");
  const [chargement, setChargement] = useState(true);

  async function charger() {
    const supabase = createClient();
    const { data } = await supabase
      .from("commentaires")
      .select("id, contenu, profiles ( pseudo )")
      .eq("produit_id", produitId)
      .order("created_at", { ascending: true });
    setCommentaires(data ?? []);
    setChargement(false);
  }

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [produitId]);

  async function envoyer() {
    if (!utilisateurId) {
      alert("Connecte-toi pour commenter.");
      return;
    }
    if (!texte.trim()) return;

    const supabase = createClient();
    const { error } = await supabase.from("commentaires").insert({
      produit_id: produitId,
      utilisateur_id: utilisateurId,
      contenu: texte.trim(),
    });

    if (error) {
      alert(error.message);
      return;
    }

    setTexte("");
    onNouveauCommentaire();
    charger();
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/45 flex items-end sm:items-center justify-center"
      onClick={onFermer}
    >
      <div
        className="bg-paper w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-5 max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold mb-4">Commentaires</h2>

        <div className="flex-1 overflow-y-auto mb-3 space-y-2">
          {!chargement && commentaires.length === 0 && (
            <p className="text-muted text-sm">Aucun commentaire.</p>
          )}
          {commentaires.map((c) => {
            const auteur = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
            return (
              <div key={c.id} className="py-2 border-b border-surface-border">
                <p className="font-semibold text-sm mb-0.5">{auteur?.pseudo}</p>
                <p className="text-sm">{c.contenu}</p>
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-2 mb-3">
          <input
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Écrire un commentaire..."
            className="flex-1 border border-surface-border rounded-lg p-2.5 text-sm outline-none focus:border-accent"
          />
          <button
            onClick={envoyer}
            className="bg-accent text-accent-ink font-semibold text-sm px-4 py-2.5 rounded-full"
          >
            Envoyer
          </button>
        </div>

        <button onClick={onFermer} className="text-muted text-sm text-center">
          Fermer
        </button>
      </div>
    </div>
  );
}
