"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

// Lien « Pulse » de la barre turquoise, avec un badge rouge comme celui des
// messages et des notifications : nombre de pulses actifs (moins de 24 h)
// d'autres membres que tu n'as pas encore vus.
export default function PulseBadgeLink({
  utilisateurId,
  nonVusInitial,
}: {
  utilisateurId: string;
  nonVusInitial: number;
}) {
  const [nonVus, setNonVus] = useState(nonVusInitial);

  useEffect(() => {
    const supabase = createClient();

    // Même règle que SiteHeader : pulses non expirés des autres membres,
    // moins ceux que tu as déjà regardés (table pulse_vues).
    async function rafraichir() {
      const { data: pulses } = await supabase
        .from("pulses")
        .select("id")
        .gt("expires_at", new Date().toISOString())
        .neq("profile_id", utilisateurId);

      const ids = (pulses ?? []).map((p) => p.id as string);
      if (ids.length === 0) {
        setNonVus(0);
        return;
      }

      const { data: vues } = await supabase
        .from("pulse_vues")
        .select("pulse_id")
        .eq("viewer_id", utilisateurId)
        .in("pulse_id", ids);

      const vus = new Set((vues ?? []).map((v) => v.pulse_id as string));
      setNonVus(ids.filter((id) => !vus.has(id)).length);
    }

    const channel = supabase
      .channel(`pulse-badge-${utilisateurId}`)
      // Un autre membre publie un pulse.
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pulses",
          filter: `profile_id=neq.${utilisateurId}`,
        },
        rafraichir
      )
      // Un pulse est supprimé (Supabase n'accepte pas de filtre ici).
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "pulses" }, rafraichir)
      // Tu regardes un pulse : le badge baisse.
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "pulse_vues",
          filter: `viewer_id=eq.${utilisateurId}`,
        },
        rafraichir
      )
      .subscribe();

    // Filet de sécurité : on recompte aussi quand l'onglet redevient visible
    // (des pulses ont pu expirer ou arriver entre-temps). Le badge reste à
    // jour même si ces tables ne sont pas dans la publication realtime.
    function auRetour() {
      if (document.visibilityState === "visible") rafraichir();
    }
    document.addEventListener("visibilitychange", auRetour);

    return () => {
      document.removeEventListener("visibilitychange", auRetour);
      supabase.removeChannel(channel);
    };
  }, [utilisateurId]);

  return (
    <Link
      href="/pulses"
      className="relative inline-flex items-center text-white font-bold text-sm"
      aria-label={nonVus > 0 ? `Pulse, ${nonVus} non vus` : "Pulse"}
    >
      Pulse
      {nonVus > 0 && (
        <span className="absolute -top-2.5 -right-3.5 min-w-[1.1rem] h-[1.1rem] rounded-full bg-danger text-[10px] leading-[1.1rem] text-white text-center px-1 font-bold">
          {nonVus > 9 ? "9+" : nonVus}
        </span>
      )}
    </Link>
  );
}
