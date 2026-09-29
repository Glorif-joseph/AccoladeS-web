"use client";

import { useEffect, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";

// SuivreBouton.tsx n'a jamais été partagé — comportement reconstruit à
// partir du schéma réel de `followers` (follower_id/suivi_id), pas du code
// source de l'app. Style aligné sur le reste du site (pilule, accent).
export default function SuivreBouton({ suiviId }: { suiviId: string }) {
  const [utilisateurId, setUtilisateurId] = useState<string | null>(null);
  const [suivi, setSuivi] = useState(false);
  const [pret, setPret] = useState(false);
  const [enCours, startTransition] = useTransition();

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || user.id === suiviId) {
        setPret(true);
        return;
      }
      setUtilisateurId(user.id);

      const { data } = await supabase
        .from("followers")
        .select("id")
        .eq("follower_id", user.id)
        .eq("suivi_id", suiviId)
        .maybeSingle();

      setSuivi(!!data);
      setPret(true);
    })();
  }, [suiviId]);

  function basculer() {
    if (!utilisateurId) return;
    const supabase = createClient();
    const prochainEtat = !suivi;
    setSuivi(prochainEtat);

    startTransition(async () => {
      if (prochainEtat) {
        await supabase
          .from("followers")
          .insert({ follower_id: utilisateurId, suivi_id: suiviId });
      } else {
        await supabase
          .from("followers")
          .delete()
          .eq("follower_id", utilisateurId)
          .eq("suivi_id", suiviId);
      }
    });
  }

  // Pas de bouton pour son propre profil, ni tant qu'on ne sait pas encore
  // si on est connecté (évite un flash "Suivre" incorrect)
  if (!pret || !utilisateurId) return null;

  return (
    <button
      onClick={basculer}
      disabled={enCours}
      className={
        suivi
          ? "rounded-full border border-surface-border text-ink text-xs font-semibold px-3 py-1"
          : "rounded-full bg-accent text-accent-ink text-xs font-semibold px-3 py-1"
      }
    >
      {suivi ? "Suivi" : "Suivre"}
    </button>
  );
}
